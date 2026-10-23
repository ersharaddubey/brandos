import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PromptView from '../components/PromptView.jsx';
import { TourProvider, GuideBar, Tip, EmptyHint } from '../components/Help.jsx';
import CreateGroup from '../components/CreateGroup.jsx';
import PageHeader from '../components/PageHeader.jsx';

const scoreClass = (s) => (s == null ? '' : s >= 75 ? 'good' : s >= 50 ? 'warn' : 'bad');

const DUMMY_FORM = {
  campaignName: 'Summer Launch 2026',
  goal: 'Instagram carousel hero for summer product drop',
  scene: 'Sunlit rooftop terrace, soft morning haze, city skyline soft in background',
  composition: 'Centered hero product, eye-level, shallow depth of field, 50mm feel',
  style: 'Clean premium commercial, warm tones, high detail, subtle film grain',
  templateId: '',
  aspectRatio: '4:5',
  avoid: 'crowd, text overlay, harsh shadows, watermark, distorted logo',
  maxAttempts: 3,
  threshold: 75,
  duration: 5,
  motion: 'slow camera push-in, subtle fabric movement',
};

const TOUR_STEPS = [
  {
    selector: '[data-tour="studio-ids"]',
    title: '1. Locked identities',
    body: 'Only LOCKED identities appear here. Select product + character + brand + environment for full control.',
    why: '“Without identity lock there is no consistency guarantee.”',
  },
  {
    selector: '[data-tour="studio-brief"]',
    title: '2. Campaign brief',
    body: 'Goal, scene, composition, and style go into the final prompt. Use Fill dummy data for example values.',
    why: '“Same identity, different campaign — change only the brief.”',
  },
  {
    selector: '[data-tour="studio-tabs"]',
    title: '3. Image or Video',
    body: 'Switch between Image Generate and Video Generate. Same locked identities work for both.',
    why: '“One identity lock → still or motion.”',
  },
];

function StudioInner() {
  const [ids, setIds] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [past, setPast] = useState([]);
  const [sel, setSel] = useState([]);
  const [form, setForm] = useState({
    campaignName: '',
    goal: '',
    scene: '',
    composition: '',
    style: '',
    templateId: '',
    aspectRatio: '',
    avoid: '',
    maxAttempts: 3,
    threshold: 75,
    duration: 5,
    motion: '',
  });
  const [compiled, setCompiled] = useState(null);
  const [active, setActive] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('image');
  const [videoResult, setVideoResult] = useState(null);

  const loadPast = () => api.generations.list().then(setPast).catch(() => {});
  useEffect(() => {
    api.identities.list('?status=locked').then(setIds).catch((e) => setErr(e.message));
    api.prompts.list().then(setPrompts);
    loadPast();
  }, []);

  useEffect(() => {
    if (!active || !['running', 'queued'].includes(active.status)) return;
    const t = setInterval(async () => {
      try {
        const g = await api.generations.get(active._id);
        setActive(g);
        if (!['running', 'queued'].includes(g.status)) {
          clearInterval(t);
          loadPast();
        }
      } catch (e) {
        setErr(e.message);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [active?._id, active?.status]);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fillDummy = () => {
    setForm({ ...DUMMY_FORM, templateId: prompts[0]?._id || '' });
    if (ids.length && !sel.length) setSel([ids[0]._id]);
  };

  const goImage = async () => {
    setErr('');
    setBusy(true);
    setVideoResult(null);
    try {
      const g = await api.generations.create({ ...form, identityIds: sel });
      setActive(await api.generations.get(g._id));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const goVideo = async () => {
    setErr('');
    setBusy(true);
    setActive(null);
    setVideoResult({ status: 'running', progress: 0, step: 'Preparing motion prompt…' });
    try {
      const compiled = await api.compile({ ...form, identityIds: sel });
      const motionPrompt = [
        compiled?.paragraph || compiled?.prompt || form.goal,
        form.motion && `MOTION: ${form.motion}`,
        form.duration && `DURATION: ${form.duration}s`,
        'Cinematic camera, consistent identity lock, smooth motion, no morphing faces.',
      ]
        .filter(Boolean)
        .join('\n\n');

      for (let p = 10; p <= 100; p += 18) {
        await new Promise((r) => setTimeout(r, 400));
        setVideoResult({
          status: p >= 100 ? 'completed' : 'running',
          progress: Math.min(p, 100),
          step: p < 40 ? 'Encoding frames…' : p < 80 ? 'Applying identity lock…' : 'Finalizing video…',
          prompt: motionPrompt,
          duration: form.duration || 5,
        });
      }
      setVideoResult((v) => ({
        ...v,
        status: 'completed',
        progress: 100,
        step: 'Done (mock). Connect a video model (Runway / Kling / Luma) in Integrations for real output.',
        note: 'Video generation is wired in UI. Backend can call external video APIs using the same locked identities.',
      }));
    } catch (e) {
      setErr(e.message);
      setVideoResult({ status: 'failed', progress: 0, step: e.message });
    }
    setBusy(false);
  };

  const compilePrompt = async () => {
    setErr('');
    setBusy(true);
    try {
      setCompiled(await api.compile({ ...form, identityIds: sel }));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const typeCounts = ids.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Studio"
        subtitle="Select locked identities (product · character · brand · environment) → Generate Image or Video on this platform."
        showDelete={true}
      />

      <div style={{ marginBottom: 12 }}>
        <CreateGroup visibility="private" onCreated={() => {}} compact />
      </div>
      <GuideBar onDummy={fillDummy} dummyLabel="Fill dummy campaign data" />
      {err && <div className="err">{err}</div>}

      <div className="tabs" data-tour="studio-tabs">
        <button
          type="button"
          className={mode === 'image' ? 'tab active' : 'tab'}
          onClick={() => setMode('image')}
        >
          Image Generate
        </button>
        <button
          type="button"
          className={mode === 'video' ? 'tab active' : 'tab'}
          onClick={() => setMode('video')}
        >
          Video Generate
        </button>
      </div>

      <div className="card" data-tour="studio-ids">
        <h2>
          1. Locked identities <Tip id="studio.ids" />
          <span className="muted small" style={{ marginLeft: 10, fontWeight: 400 }}>
            {Object.entries(typeCounts)
              .map(([t, n]) => `${t}: ${n}`)
              .join(' · ') || 'none locked yet'}
          </span>
        </h2>
        {!ids.length && (
          <EmptyHint
            title="Pehle Identity Lock karo"
            body="Identity Lock page pe reference upload → analyse → Lock. Product / Character / Brand / Environment alag-alag banao for full control."
            why="Unlocked draft generate loop me nahi jaati — consistency ke liye lock zaroori."
          />
        )}
        <p className="muted small" style={{ marginBottom: 12 }}>
          Card pe click = select / deselect. <b>Open</b> pe click = Identity Detail page (references dekhne ke liye).
        </p>
        <div className="grid">
          {ids.map((i) => {
            const refs = (i.referenceAssetIds || []).filter(Boolean);
            const thumb = refs[0]?.url || refs[0]?.filename;
            const thumbSrc = thumb
              ? (String(thumb).startsWith('http') || String(thumb).startsWith('/') ? thumb : `/uploads/${thumb}`)
              : null;
            return (
              <div
                key={i._id}
                className={'id-card' + (sel.includes(i._id) ? ' selected' : '')}
              >
                <div
                  className="id-card-main"
                  onClick={() => toggle(i._id)}
                  style={{ cursor: 'pointer' }}
                  title="Click to select / deselect"
                >
                  {thumbSrc ? (
                    <img className="id-thumb" src={thumbSrc} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="id-thumb placeholder">No image</div>
                  )}
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                    <span className={'badge type-' + i.type}>{i.type}</span>
                    {sel.includes(i._id) && <span className="badge good">selected</span>}
                  </div>
                  <b style={{ display: 'block', marginTop: 6 }}>{i.name}</b>
                  <div className="muted small">
                    v{i.version} · {refs.length} ref{refs.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10, gap: 6 }}>
                  <button
                    type="button"
                    className="ghost"
                    style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/identities/${i._id}`; }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={sel.includes(i._id) ? '' : 'ghost'}
                    style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); toggle(i._id); }}
                  >
                    {sel.includes(i._id) ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {sel.length > 0 && (
          <div className="selected-strip" style={{ marginTop: 14 }}>
            <div className="muted small" style={{ marginBottom: 8 }}>
              Selected combination ({sel.length}): ye identities generate me use hongi
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {ids.filter((i) => sel.includes(i._id)).map((i) => {
                const refs = (i.referenceAssetIds || []).filter(Boolean);
                const thumb = refs[0]?.url || refs[0]?.filename;
                const thumbSrc = thumb
                  ? (String(thumb).startsWith('http') || String(thumb).startsWith('/') ? thumb : `/uploads/${thumb}`)
                  : null;
                return (
                  <div key={i._id} className="selected-chip">
                    {thumbSrc && <img src={thumbSrc} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                    <span className={'badge type-' + i.type}>{i.type}</span>
                    <b>{i.name}</b>
                    <button type="button" className="ghost" style={{ padding: '2px 6px' }} onClick={() => toggle(i._id)}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card" data-tour="studio-brief">
        <h2>2. Campaign brief</h2>
        <div className="two">
          <div>
            <label>Campaign name</label>
            <input value={form.campaignName} onChange={set('campaignName')} placeholder="Summer Launch 2026" />
          </div>
          <div>
            <label>Prompt template (optional)</label>
            <select value={form.templateId} onChange={set('templateId')}>
              <option value="">— default —</option>
              {prompts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (v{p.currentVersion})
                </option>
              ))}
            </select>
          </div>
        </div>
        <label>Campaign goal</label>
        <input value={form.goal} onChange={set('goal')} placeholder="Summer launch social creative" />
        <label>Scene</label>
        <textarea value={form.scene} onChange={set('scene')} placeholder="On a sunlit rooftop, morning haze" />
        <div className="two">
          <div>
            <label>Composition</label>
            <input
              value={form.composition}
              onChange={set('composition')}
              placeholder="Centered hero shot, shallow depth of field"
            />
          </div>
          <div>
            <label>Style</label>
            <input value={form.style} onChange={set('style')} placeholder="Clean, premium, warm tones" />
          </div>
        </div>
        <div className="two">
          <div>
            <label>Aspect ratio</label>
            <select value={form.aspectRatio} onChange={set('aspectRatio')}>
              <option value="">from reference</option>
              {['1:1', '4:5', '3:4', '9:16', '16:9'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Avoid (comma separated)</label>
            <input value={form.avoid} onChange={set('avoid')} placeholder="crowd, text overlay, harsh shadows" />
          </div>
        </div>

        {mode === 'video' && (
          <div className="two" style={{ marginTop: 8 }}>
            <div>
              <label>Duration (seconds)</label>
              <input type="number" min="2" max="15" value={form.duration} onChange={set('duration')} />
            </div>
            <div>
              <label>Motion description</label>
              <input
                value={form.motion}
                onChange={set('motion')}
                placeholder="slow push-in, fabric sway, wind in hair"
              />
            </div>
          </div>
        )}

        {mode === 'image' && (
          <div className="two">
            <div>
              <label>Max attempts (auto-improve loop)</label>
              <input type="number" min="1" max="6" value={form.maxAttempts} onChange={set('maxAttempts')} />
            </div>
            <div>
              <label>Pass threshold (consistency score)</label>
              <input type="number" min="1" max="100" value={form.threshold} onChange={set('threshold')} />
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 14 }} data-tour="studio-actions">
          <button disabled={!sel.length || busy} onClick={compilePrompt}>
            Get prompt (JSON + paragraph)
          </button>
          {mode === 'image' ? (
            <button
              className="primary"
              disabled={!sel.length || busy || ['running', 'queued'].includes(active?.status)}
              onClick={goImage}
            >
              {['running', 'queued'].includes(active?.status) ? 'Generating image…' : 'Generate Image'}
            </button>
          ) : (
            <button className="primary" disabled={!sel.length || busy} onClick={goVideo}>
              {busy && videoResult?.status === 'running' ? 'Generating video…' : 'Generate Video'}
            </button>
          )}
          <Tip id="studio.actions" />
        </div>
      </div>

      <PromptView result={compiled} title="Prompt for your campaign" />

      {mode === 'image' && active && <Result gen={active} />}

      {mode === 'video' && videoResult && (
        <div className="card video-result">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Video Result</h2>
            <span className={'badge ' + (videoResult.status === 'completed' ? 'good' : videoResult.status === 'failed' ? 'bad' : '')}>
              {videoResult.status}
            </span>
          </div>
          {videoResult.status === 'running' && (
            <div style={{ margin: '12px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted small">{videoResult.step}</span>
                <b>{videoResult.progress}%</b>
              </div>
              <div className="progress-bar">
                <i style={{ width: `${videoResult.progress}%` }} />
              </div>
            </div>
          )}
          {videoResult.status === 'completed' && (
            <>
              <div className="video-placeholder">
                <div className="play-icon">▶</div>
                <p>
                  {videoResult.duration || 5}s mock video ready
                  <br />
                  <span className="muted small">Connect Runway / Kling / Luma in Integrations for real render</span>
                </p>
              </div>
              {videoResult.note && <p className="muted small">{videoResult.note}</p>}
              <details>
                <summary>Motion prompt used</summary>
                <pre>{videoResult.prompt}</pre>
              </details>
            </>
          )}
          {videoResult.status === 'failed' && <div className="err">{videoResult.step}</div>}
        </div>
      )}

      {past.length > 0 && mode === 'image' && (
        <div className="card">
          <h2>Recent generations</h2>
          {past.slice(0, 8).map((g) => (
            <div className="row" key={g._id} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span>
                {g.inputs?.goal || 'Generation'} · <span className={'badge ' + g.status}>{g.status}</span>
              </span>
              <button className="ghost" onClick={() => setActive(g)}>
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Result({ gen }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Result</h2>
        <span className={'badge ' + gen.status}>
          {gen.status}
          {['running', 'queued'].includes(gen.status) && ' ...'}
        </span>
      </div>
      {gen.error && <div className="err">{gen.error}</div>}
      {['running', 'queued'].includes(gen.status) && (
        <div style={{ margin: '10px 0' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted small">{gen.currentStep || 'Working...'}</span>
            <b>{gen.progress || 0}%</b>
          </div>
          <div className="progress-bar">
            <i style={{ width: `${Math.max(0, Math.min(100, gen.progress || 0))}%` }} />
          </div>
        </div>
      )}
      <div className="grid big">
        {(gen.attempts || []).map((a) => (
          <div
            className="card"
            key={a.n}
            style={{ marginBottom: 0, borderColor: gen.bestAttempt === a.n ? 'var(--good)' : undefined }}
          >
            {a.assetId && <img className="thumb" src={a.assetId.url} alt={`attempt ${a.n}`} />}
            <div className="row" style={{ margin: '8px 0', justifyContent: 'space-between' }}>
              <b>
                Attempt {a.n}
                {gen.bestAttempt === a.n && ' · best'}
              </b>
              <span className="muted small">
                {a.width && a.height ? `${a.width}×${a.height}` : ''}
                {a.seed != null ? ` · seed ${a.seed}` : ''}
              </span>
              <span className={'badge ' + scoreClass(a.score)}>
                {a.score == null ? 'unchecked' : `score ${a.score}`}
              </span>
            </div>
            {a.checks?.map((c) => (
              <div className="small muted" key={c.name}>
                {c.name}: {c.score}
              </div>
            ))}
            {a.error && (
              <div className="small" style={{ color: 'var(--bad)' }}>
                {a.error}
              </div>
            )}
            {a.note && <div className="small muted">{a.note}</div>}
            {a.mismatches?.length > 0 && (
              <ul className="plain small">
                {a.mismatches.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
            <details>
              <summary>prompt used</summary>
              <pre>{a.prompt}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Studio() {
  return (
    <TourProvider steps={TOUR_STEPS}>
      <StudioInner />
    </TourProvider>
  );
}
