import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Thumb, { assetUrl } from '../components/Thumb.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PromptView, { Copy } from '../components/PromptView.jsx';
import { TourProvider, GuideBar, Tip, EmptyHint } from '../components/Help.jsx';
import CreateGroup from '../components/CreateGroup.jsx';

const tone = (s) => (s == null ? '' : s >= 75 ? 'good' : s >= 50 ? 'warn' : 'bad');

const emptyAnalysis = () => ({
  promptText: '',
  subject: '',
  style: '',
  lighting: '',
  mood: '',
  camera: '',
  faceDescription: '',
  identityAnchors: '',
  negativePrompt: '',
  colors: '',
  materials: '',
  mustPreserve: '',
  objects: '',
  aspectRatio: '',
  consistencyNotes: '',
  platformRaw: '',
  platformMidjourney: '',
  platformFlux: '',
  platformSdxl: '',
});

const DUMMY_ANALYSIS = {
  promptText:
    'A young man in his late 20s sits at a wooden desk holding a black ceramic mug. Soft window light from the left, bookshelf and a framed print behind him. Photorealistic portrait, warm tones, shallow depth of field, high detail.',
  subject: 'Young man at desk with black mug',
  style: 'Photorealistic portrait photography, warm subtle desaturation',
  lighting: 'Soft window light from left, gentle fill, warm lamp glow on right',
  mood: 'Calm, focused, creative studio',
  camera: 'Eye-level medium shot, 50mm, wide aperture, shallow DOF',
  faceDescription:
    'Late 20s male, rectangular face, strong jawline, medium-dark brown skin warm undertone, almond brown eyes, arched dark brows, straight medium nose, full natural pinkish-brown lips',
  identityAnchors: 'exact glasses shape\nsignature mole on left cheek\nwristwatch dark strap round face',
  negativePrompt: 'blurry, extra fingers, deformed hands, watermark, misspelled text, different person, changed hairstyle',
  colors: 'warm wood, matte black ceramic, soft cream walls',
  materials: 'wood desk, ceramic mug, fabric shirt',
  mustPreserve: 'face geometry, glasses, watch, mug shape',
  objects: 'black mug, wristwatch, bookshelf, framed picture, potted plant',
  aspectRatio: '4:5',
  consistencyNotes: 'Keep face and glasses identical across generations',
};

const DUMMY_CHECK = {
  goal: 'Summer launch social creative',
  scene: 'Sunlit rooftop, morning haze',
  composition: 'Centered hero, shallow DOF',
  style: 'Clean premium, warm tones',
  aspectRatio: '4:5',
  avoid: 'crowd, text overlay, harsh shadows',
};

function fromServer(p) {
  if (!p) return emptyAnalysis();
  return {
    promptText: p.promptText || '',
    subject: p.subject || '',
    style: p.style || '',
    lighting: p.lighting || '',
    mood: p.mood || '',
    camera: p.camera || '',
    faceDescription: p.faceDescription || '',
    identityAnchors: Array.isArray(p.identityAnchors) ? p.identityAnchors.join('\n') : (p.identityAnchors || ''),
    negativePrompt: p.negativePrompt || '',
    colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
    materials: Array.isArray(p.materials) ? p.materials.join(', ') : (p.materials || ''),
    mustPreserve: Array.isArray(p.mustPreserve) ? p.mustPreserve.join(', ') : (p.mustPreserve || ''),
    objects: Array.isArray(p.objects) ? p.objects.join(', ') : (p.objects || ''),
    aspectRatio: p.aspectRatio || '',
    consistencyNotes: p.consistencyNotes || '',
    platformRaw: p.platformPrompts?.raw || p.promptText || '',
    platformMidjourney: p.platformPrompts?.midjourney || '',
    platformFlux: p.platformPrompts?.flux || '',
    platformSdxl: p.platformPrompts?.sdxl || '',
  };
}

const TOUR_STEPS = [
  {
    selector: '[data-tour="check-tabs"]',
    title: 'Two modes',
    body: 'Consistency Check scores a generated image against identity anchors. Image Analysis turns a photo into a structured prompt and can generate freely.',
    why: '“Verify and reverse-engineer in one place.”',
  },
  {
    selector: '[data-tour="check-ids"]',
    title: 'Identity select',
    body: 'Pick identities to score against. Each card shows the reference thumbnail when available.',
    why: '“Consistency needs a locked reference.”',
  },
];

function CheckInner() {
  const [mode, setMode] = useState('check'); // check | analysis
  const [ids, setIds] = useState([]);
  const [sel, setSel] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ goal: '', scene: '', composition: '', style: '', aspectRatio: '', avoid: '' });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Analysis state
  const [analysisTab, setAnalysisTab] = useState('from-image');
  const [aForm, setAForm] = useState(emptyAnalysis());
  const [preview, setPreview] = useState(null);
  const [aFile, setAFile] = useState(null);
  const [aBusy, setABusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [platformTab, setPlatformTab] = useState('raw');

  useEffect(() => {
    api.identities.list().then((l) => setIds(l.filter((i) => i.status !== 'analyzing'))).catch((e) => setErr(e.message));
  }, []);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setA = (k) => (e) => setAForm((f) => ({ ...f, [k]: e.target.value }));

  const fillDummy = () => {
    if (mode === 'check') {
      setForm({ ...DUMMY_CHECK });
      if (ids.length && !sel.length) setSel([ids[0]._id]);
    } else {
      setAnalysisTab('freeform');
      setAForm({ ...emptyAnalysis(), ...DUMMY_ANALYSIS });
      setResult(null);
    }
    setErr('');
  };

  const runCheck = async () => {
    setErr(''); setRes(null); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('identityIds', sel.join(','));
      fd.append('image', file);
      setRes(await api.check(fd));
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const onAnalysisFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Please select an image file'); return; }
    if (f.size > 12 * 1024 * 1024) { setErr('Image too large (max 12MB)'); return; }
    setErr('');
    setAFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const generatePrompt = async () => {
    if (!aFile) { setErr('Upload an image first'); return; }
    setErr(''); setABusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('image', aFile);
      const data = await api.imageToPrompt(fd);
      setAForm(fromServer(data.prompt));
    } catch (e) { setErr(e.message || 'Could not generate prompt'); }
    setABusy(false);
  };

  const buildFullPrompt = () => {
    const parts = [
      aForm.promptText,
      aForm.subject && `Subject: ${aForm.subject}`,
      aForm.style && `Style: ${aForm.style}`,
      aForm.lighting && `Lighting: ${aForm.lighting}`,
      aForm.mood && `Mood: ${aForm.mood}`,
      aForm.camera && `Camera: ${aForm.camera}`,
      aForm.faceDescription && `Face: ${aForm.faceDescription}`,
      aForm.identityAnchors && `Identity anchors:\n${aForm.identityAnchors}`,
      aForm.colors && `Colors: ${aForm.colors}`,
      aForm.materials && `Materials: ${aForm.materials}`,
      aForm.mustPreserve && `Must preserve: ${aForm.mustPreserve}`,
      aForm.objects && `Objects: ${aForm.objects}`,
      aForm.consistencyNotes && `Notes: ${aForm.consistencyNotes}`,
      aForm.aspectRatio && `Aspect ratio: ${aForm.aspectRatio}`,
    ].filter(Boolean);
    return parts.join('\n\n');
  };

  const hasPrompt = () =>
    !!(aForm.promptText.trim() || aForm.subject.trim() || aForm.style.trim() || aForm.faceDescription.trim() || aForm.identityAnchors.trim());

  const createImage = async () => {
    const prompt = aForm.promptText.trim() || buildFullPrompt();
    if (!prompt.trim()) { setErr('Write a prompt or generate one from an image first'); return; }
    setErr(''); setGenBusy(true); setResult(null);
    try {
      const data = await api.generateImage({
        prompt,
        negativePrompt: aForm.negativePrompt || undefined,
        aspectRatio: aForm.aspectRatio || undefined,
      });
      setResult(data);
    } catch (e) { setErr(e.message || 'Image generation failed'); }
    setGenBusy(false);
  };

  const platformValue =
    platformTab === 'midjourney' ? aForm.platformMidjourney
    : platformTab === 'flux' ? aForm.platformFlux
    : platformTab === 'sdxl' ? aForm.platformSdxl
    : aForm.platformRaw || aForm.promptText;

  return (
    <>
      <PageHeader title="Check & Analysis" subtitle="Consistency check + image analysis against locked identities." showDelete={true} />
      <p className="sub">
        Consistency check (identity anchors vs image) + Image Analysis (photo → structured prompt → freeform generate).
      </p>
      <GuideBar onDummy={fillDummy} dummyLabel="Fill dummy data" />
      {err && <div className="err">{err}</div>}

      <div className="tabs" data-tour="check-tabs">
        <button type="button" className={mode === 'check' ? '' : 'ghost'} onClick={() => setMode('check')}>Consistency Check</button>
        <button type="button" className={mode === 'analysis' ? '' : 'ghost'} onClick={() => setMode('analysis')}>Image Analysis</button>
      </div>

      {mode === 'check' && (
        <>
          <div className="card" data-tour="check-ids">
            <h2>1. Identity select <Tip id="check.ids" /></h2>
            <div style={{ marginBottom: 12 }}>
              <CreateGroup visibility="private" onCreated={() => {}} compact />
            </div>
            <div className="grid grid-4">
              {ids.map((i) => {
                const imgUrl = assetUrl(Array.isArray(i.referenceAssetIds) ? i.referenceAssetIds[0] : null);
                const selected = sel.includes(i._id);
                return (
                  <button
                    key={i._id}
                    type="button"
                    className={'ghost id-pick' + (selected ? ' selected' : '')}
                    onClick={() => toggle(i._id)}
                    style={{
                      padding: 8,
                      textAlign: 'left',
                      borderColor: selected ? 'var(--accent-line)' : undefined,
                      boxShadow: selected ? '0 0 0 2px var(--accent-line)' : undefined,
                      background: selected ? 'var(--accent-soft)' : undefined,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Thumb className="thumb" src={imgUrl} label={i.name} type={i.type} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.name}>{i.name}</div>
                    <div className="row" style={{ marginTop: 4, gap: 4 }}>
                      <span className={'badge ' + i.status}>{i.status}</span>
                      <span className="badge">{i.type}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {!ids.length && (
              <EmptyHint title="Pehle identity banao" body="Identity Lock mein reference upload karke lock karo." why="“Bina identity ke score compare nahi ho sakta.”" />
            )}
          </div>

          <div className="card" data-tour="check-form">
            <h2>2. Generated image + scene <Tip id="check.upload" /></h2>
            <label>Generated image</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
            <label>Scene</label>
            <input value={form.scene} onChange={set('scene')} />
            <div className="two">
              <div><label>Composition</label><input value={form.composition} onChange={set('composition')} /></div>
              <div><label>Style</label><input value={form.style} onChange={set('style')} /></div>
            </div>
            <div className="two">
              <div><label>Goal</label><input value={form.goal} onChange={set('goal')} /></div>
              <div><label>Aspect ratio</label><input value={form.aspectRatio} onChange={set('aspectRatio')} placeholder="4:5" /></div>
            </div>
            <label>Avoid</label>
            <input value={form.avoid} onChange={set('avoid')} />
            <div className="row" style={{ marginTop: 18, gap: 12 }}>
              <button disabled={busy || !sel.length || !file} onClick={runCheck}>
                {busy ? 'Checking…' : 'Run check'}
              </button>
            </div>
          </div>

          {res && (
            <div className="card">
              <h2>Score <span className={'badge ' + tone(res.score)}>{res.score == null ? 'n/a' : res.score}</span></h2>
              {res.checks?.map((c) => (
                <div key={c.name} className="small muted">{c.name}: {c.score}</div>
              ))}
              {res.mismatches?.length > 0 && (
                <ul className="plain small">{res.mismatches.map((m, i) => <li key={i}>{m}</li>)}</ul>
              )}
              {res.improved && <PromptView result={res.improved} title="Improved prompt (v2)" />}
            </div>
          )}
        </>
      )}

      {mode === 'analysis' && (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            <button type="button" className={analysisTab === 'from-image' ? '' : 'ghost'} onClick={() => setAnalysisTab('from-image')}>
              Image → Prompt
            </button>
            <button type="button" className={analysisTab === 'freeform' ? '' : 'ghost'} onClick={() => setAnalysisTab('freeform')}>
              Freeform Prompt → Image
            </button>
          </div>

          {analysisTab === 'from-image' && (
            <div className="card">
              <h2>1. Image upload</h2>
              <p className="muted small">Extract a detailed prompt from a reference or screenshot (analysis).</p>
              <input type="file" accept="image/*" onChange={onAnalysisFile} />
              {preview && (
                <div style={{ marginTop: 12 }}>
                  <img className="img-frame" src={preview} alt="upload" />
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button type="button" disabled={aBusy || !aFile} onClick={generatePrompt}>
                  {aBusy ? 'Analyzing image…' : 'Generate detailed prompt'}
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2>{analysisTab === 'from-image' ? '2. Structured prompt' : '1. Prompt'}</h2>
            <label>Main prompt</label>
            <textarea rows={5} value={aForm.promptText} onChange={setA('promptText')} placeholder="Long natural English prompt…" />
            <div className="two">
              <div><label>Subject</label><input value={aForm.subject} onChange={setA('subject')} /></div>
              <div><label>Style</label><input value={aForm.style} onChange={setA('style')} /></div>
            </div>
            <div className="two">
              <div><label>Lighting</label><input value={aForm.lighting} onChange={setA('lighting')} /></div>
              <div><label>Mood</label><input value={aForm.mood} onChange={setA('mood')} /></div>
            </div>
            <div className="two">
              <div><label>Camera</label><input value={aForm.camera} onChange={setA('camera')} /></div>
              <div><label>Aspect ratio</label><input value={aForm.aspectRatio} onChange={setA('aspectRatio')} placeholder="4:5" /></div>
            </div>
            <label>Face description</label>
            <textarea rows={2} value={aForm.faceDescription} onChange={setA('faceDescription')} />
            <label>Identity anchors (one per line)</label>
            <textarea rows={2} value={aForm.identityAnchors} onChange={setA('identityAnchors')} />
            <div className="two">
              <div><label>Colors</label><input value={aForm.colors} onChange={setA('colors')} /></div>
              <div><label>Materials</label><input value={aForm.materials} onChange={setA('materials')} /></div>
            </div>
            <div className="two">
              <div><label>Must preserve</label><input value={aForm.mustPreserve} onChange={setA('mustPreserve')} /></div>
              <div><label>Objects</label><input value={aForm.objects} onChange={setA('objects')} /></div>
            </div>
            <label>Negative prompt</label>
            <input value={aForm.negativePrompt} onChange={setA('negativePrompt')} />
            <label>Consistency notes</label>
            <textarea rows={2} value={aForm.consistencyNotes} onChange={setA('consistencyNotes')} />
          </div>

          {(aForm.platformRaw || aForm.platformMidjourney || aForm.platformFlux || aForm.platformSdxl) && (
            <div className="card">
              <h2>Platform-ready prompts</h2>
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                {['raw', 'midjourney', 'flux', 'sdxl'].map((t) => (
                  <button key={t} type="button" className={platformTab === t ? '' : 'ghost'} onClick={() => setPlatformTab(t)}>{t}</button>
                ))}
                <Copy text={platformValue} label="Copy" />
              </div>
              <pre className="scroll">{platformValue || '—'}</pre>
            </div>
          )}

          <div className="card">
            <h2>{analysisTab === 'from-image' ? '3. Create image' : '2. Create image'}</h2>
            <p className="muted small">Freeform generate without identity lock. Result is saved to Asset Bank.</p>
            <button type="button" disabled={genBusy || !hasPrompt()} onClick={createImage}>
              {genBusy ? 'Generating…' : 'Create image'}
            </button>
            {result && (
              <div style={{ marginTop: 16 }}>
                <p className="muted small">
                  seed: {result.seed}
                  {result.width && result.height ? ` · ${result.width}×${result.height}` : ''}
                  {' · saved as asset'}
                </p>
                <img className="img-frame wide" src={result.url} alt="generated" />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function Check() {
  return (
    <TourProvider steps={TOUR_STEPS}>
      <CheckInner />
    </TourProvider>
  );
}
