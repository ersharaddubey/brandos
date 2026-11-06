import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PromptView from '../components/PromptView.jsx';
import { TourProvider, GuideBar, Tip, EmptyHint } from '../components/Help.jsx';
import CreateGroup from '../components/CreateGroup.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Thumb, { assetUrl } from '../components/Thumb.jsx';

const scoreClass = (s) => (s == null ? '' : s >= 75 ? 'good' : s >= 50 ? 'warn' : 'bad');

/** Same order as promptCompiler — selected chips show in this sequence */
const TYPE_ORDER = { character: 0, product: 1, brand: 2, environment: 3 };
const SEGMENT_TYPES = ['character', 'product', 'brand', 'environment'];
const newSegment = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  start: '0:00',
  end: '',
  extract: [...SEGMENT_TYPES],
});

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
    body: 'Only LOCKED identities appear here. Select product + character + brand + environment + brand + environment (or sirf brand ke multiple). Neeche + se type dikh ke add karo — koi limit nahi.',
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
    focus: '',
    maxAttempts: 3,
    threshold: 75,
    duration: 5,
    motion: '',
    // video-specific
    videoTsStart: '',
    videoTsEnd: '',
    extractWhat: 'character,product,brand,environment',
  });
  // Reference video for Video mode (extract locks / guide generation)
  const [refVideo, setRefVideo] = useState(null); // { file, url, name, duration, source: 'file'|'drive' }
  const [driveUrl, setDriveUrl] = useState('');
  const [videoSegments, setVideoSegments] = useState(() => [newSegment()]);
  const [refVideoBusy, setRefVideoBusy] = useState(false);
  const [compiled, setCompiled] = useState(null);
  const [active, setActive] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('image');
  const [videoResult, setVideoResult] = useState(null);
  const [videoFile, setVideoFile] = useState(null); // { busy, url, error, seconds }

  // Ad-hoc upload: multiple images + type — list rehti hai, har upload chip add hota hai
  const [adHocType, setAdHocType] = useState('product');
  const [adHocName, setAdHocName] = useState('');
  const [adHocBusy, setAdHocBusy] = useState(false);
  const [adHocList, setAdHocList] = useState([]); // { localId, name, type, preview, identityId?, status }

  const loadPast = () => api.generations.list().then(setPast).catch(() => {});
  const loadIds = () =>
    api.identities.list('?status=locked').then(setIds).catch((e) => setErr(e.message));
  useEffect(() => {
    loadIds();
    api.prompts.list().then(setPrompts).catch(() => {});
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

  const toggle = (id) => {
    const sid = String(id);
    setSel((s) => (s.map(String).includes(sid) ? s.filter((x) => String(x) !== sid) : [...s, sid]));
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  /** Studio se seedha naya reference upload + type → list mein chip add, identity create */
  const onAdHocFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Please select an image file');
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setErr('Image too large (max 12MB)');
      return;
    }
    setErr('');
    setAdHocBusy(true);
    const localId = `adhoc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const preview = URL.createObjectURL(f);
    const name =
      (adHocName || '').trim() ||
      `${adHocType.charAt(0).toUpperCase() + adHocType.slice(1)} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    // pehle list mein chip dikhao (uploading)
    setAdHocList((prev) => [
      ...prev,
      { localId, name, type: adHocType, preview, status: 'uploading' },
    ]);
    setAdHocName('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('type', adHocType);
      fd.append('description', `Ad-hoc reference from Studio (${adHocType})`);
      fd.append('image', f);
      fd.append('visibility', 'private');
      const created = await api.identities.create(fd);
      setAdHocList((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, identityId: created._id, status: 'created', name: created.name || name }
            : item
        )
      );
      loadIds();
    } catch (err) {
      setAdHocList((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, status: 'failed' } : item
        )
      );
      setErr(err.message || 'Upload failed');
    }
    setAdHocBusy(false);
    e.target.value = '';
  };

  const removeAdHoc = (localId) => {
    setAdHocList((prev) => {
      const item = prev.find((x) => x.localId === localId);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((x) => x.localId !== localId);
    });
  };

  const fillDummy = () => {
    setForm({ ...DUMMY_FORM, templateId: prompts[0]?._id || '' });
    if (ids.length && !sel.length) setSel([String(ids[0]._id)]);
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

  const onRefVideo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setErr('Please select a video file (mp4, webm, mov…)');
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setErr('Video too large (max 200MB for browser preview)');
      return;
    }
    setErr('');
    if (refVideo?.url) URL.revokeObjectURL(refVideo.url);
    const url = URL.createObjectURL(f);
    setRefVideo({ file: f, url, name: f.name, duration: null, source: 'file' }); setDriveUrl('');
    // try read duration
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.src = url;
    vid.onloadedmetadata = () => {
      setRefVideo((v) => (v ? { ...v, duration: Math.round(vid.duration) } : v));
    };
    e.target.value = '';
  };

  const clearRefVideo = () => {
    if (refVideo?.url && refVideo?.source === 'file') URL.revokeObjectURL(refVideo.url);
    setRefVideo(null);
    setDriveUrl('');
  };

  const goVideo = async () => {
    setErr('');
    if (!sel.length) {
      setErr('Select at least one locked identity');
      return;
    }
    setBusy(true);
    setVideoResult({ status: 'running', progress: 5, step: 'Reading locks + video reference…', prompt: '' });
    try {
      const videoUrl = (driveUrl || '').trim() || refVideo?.driveLink || (refVideo?.source === 'drive' ? refVideo.url : '') || '';
      const videoName = refVideo?.name || (videoUrl ? 'Google Drive / remote video' : '');
      setVideoResult((v) => ({ ...v, progress: 25, step: videoUrl ? 'Resolving Google Drive / video link…' : 'Building from identity locks only…' }));
      const segments = videoSegments.map((s) => ({
        start: s.start,
        end: s.end,
        extract: s.extract,
      }));
      const out = await api.videoPrompt({
        ...form,
        identityIds: sel,
        videoUrl: videoUrl || undefined,
        videoName: videoName || undefined,
        videoTsStart: form.videoTsStart,
        videoTsEnd: form.videoTsEnd,
        extractWhat: form.extractWhat,
        segments,
        duration: form.duration,
        motion: form.motion,
      });
      setVideoResult({
        status: 'completed',
        progress: 100,
        step: 'Video prompt ready',
        prompt: out.paragraph,
        duration: form.duration || 5,
        note: out.reference?.driveNote
          || (videoUrl
            ? 'Reference video link + locks compiled. Copy prompt to Runway / Kling / Luma (or wire Integrations).'
            : 'Locks-only video prompt. Add a Google Drive link for reference-guided motion.'),
        hasRefVideo: !!(videoUrl || refVideo),
        timestamps: out.reference?.timestamps || null,
        reference: out.reference || null,
      });
    } catch (e) {
      setVideoResult({ status: 'failed', progress: 0, step: e.message });
      setErr(e.message);
    }
    setBusy(false);
  };

  const applyDriveLink = () => {
    const u = (driveUrl || '').trim();
    if (!u) {
      setErr('Paste a Google Drive share link first');
      return;
    }
    setErr('');
    // extract id for embed preview
    const m = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const id = m ? m[1] : null;
    const preview = id ? `https://drive.google.com/file/d/${id}/preview` : u;
    if (refVideo?.url && refVideo?.source === 'file') URL.revokeObjectURL(refVideo.url);
    setRefVideo({
      file: null,
      url: preview,
      name: id ? `Google Drive (${id.slice(0, 8)}…)` : 'Remote video',
      duration: null,
      source: 'drive',
      driveLink: u,
    });
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
        subtitle={mode === "image" ? "Image Generate — still frames from locked identities + brief" : "Video Generate — Google Drive / video link + locks → motion prompt (alag flow)"}
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
          onClick={() => { setMode('image'); setVideoResult(null); setVideoFile(null); }}
        >
          Image Generate
        </button>
        <button
          type="button"
          className={mode === 'video' ? 'tab active' : 'tab'}
          onClick={() => { setMode('video'); setVideoResult(null); setVideoFile(null); }}
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
          Kitne bhi select kar sakte ho (product + character + brand + environment + brand + environment ya sirf brand ke 2–3 refs). Neeche + se bhi add kar sakte ho.
        </p>
        <div className="grid">
          {ids.map((i) => {
            const refs = (i.referenceAssetIds || []).filter(Boolean);
            const thumbSrc = assetUrl(refs[0]);
            return (
              <div
                key={i._id}
                className={'id-card' + (sel.map(String).includes(String(i._id)) ? ' selected' : '')}
              >
                <div
                  className="id-card-main"
                  onClick={() => toggle(i._id)}
                  style={{ cursor: 'pointer' }}
                  title="Click to select / deselect"
                >
                  <Thumb className="id-thumb" src={thumbSrc} label={i.name} type={i.type} />
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                    <span className={'badge type-' + i.type}>{i.type}</span>
                    {sel.map(String).includes(String(i._id)) && <span className="badge good">selected</span>}
                  </div>
                  <span className="id-name" title={i.name}>{i.name}</span>
                  <div className="muted small">
                    v{i.version} · {refs.length} ref{refs.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="row" style={{ marginTop: 12, gap: 10 }}>
                  <button
                    type="button"
                    className="ghost"
                    style={{ flex: 1, padding: '8px 10px', fontSize: 12, minWidth: 0 }}
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/identities/${i._id}`; }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={sel.map(String).includes(String(i._id)) ? '' : 'ghost'}
                    style={{ flex: 1, padding: '8px 10px', fontSize: 12, minWidth: 0 }}
                    onClick={(e) => { e.stopPropagation(); toggle(i._id); }}
                  >
                    {sel.map(String).includes(String(i._id)) ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected strip + Add (+) — always visible so 4th (or more) easily add ho sake */}
        <div className="selected-strip" style={{ marginTop: 14 }}>
          <div className="muted small" style={{ marginBottom: 8 }}>
            {sel.length === 0
              ? 'Selected locks. + se aur add karo.'
              : `${sel.length} selected — generate me ye locks use honge.`}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {ids
              .filter((i) => sel.map(String).includes(String(i._id)))
              .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9))
              .map((i) => {
              const thumbSrc = assetUrl((i.referenceAssetIds || []).filter(Boolean)[0]);
              return (
                <div key={i._id} className="selected-chip" title={`${i.name} · ${i.type}`}>
                  <Thumb className="thumb" src={thumbSrc} label={i.name} type={i.type} size={36} />
                  <span className={'badge type-' + i.type}>{i.type}</span>
                  <b title={i.name}>{i.name}</b>
                  <button type="button" className="ghost" style={{ padding: '2px 6px' }} onClick={() => toggle(i._id)} title="Remove">×</button>
                </div>
              );
            })}

            {/* + button: pick remaining locked identities (shows type so brand/product etc clear) */}
            {ids.some((i) => !sel.map(String).includes(String(i._id))) && (
              <div className="selected-chip add-chip" style={{ cursor: 'pointer', borderStyle: 'dashed', opacity: 0.9 }}>
                <select
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    maxWidth: 180,
                    outline: 'none',
                  }}
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) toggle(id);
                    e.target.value = '';
                  }}
                  title="Add another identity (type dikhega)"
                >
                  <option value="">+ Add reference…</option>
                  {ids
                    .filter((i) => !sel.map(String).includes(String(i._id)))
                    .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9))
                    .map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.type} · {i.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {ids.length > 0 && ids.every((i) => sel.map(String).includes(String(i._id))) && (
              <span className="muted small">Sab locked identities select ho chuke hain</span>
            )}
            {!ids.length && (
              <span className="muted small">Pehle Identity Lock page se product / character / brand / environment lock karo</span>
            )}
          </div>
        </div>

        {/* Ad-hoc upload box — multiple images, har ek chip ke saath rehta hai */}
        <div className="selected-strip" style={{ marginTop: 12 }}>
          <div className="muted small" style={{ marginBottom: 8 }}>
            Still image upload → Lock page pe lock → yahan select. Video ref sirf Video tab me.
          </div>

          {/* Uploaded chips list — pehle wali gayab nahi hoti */}
          {adHocList.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {adHocList.map((item) => (
                <div
                  key={item.localId}
                  className="selected-chip"
                  title={`${item.name} · ${item.type} · ${item.status}`}
                  style={{
                    opacity: item.status === 'failed' ? 0.6 : 1,
                    border: item.status === 'failed' ? '1px solid var(--bad)' : undefined,
                  }}
                >
                  <Thumb className="thumb" src={item.preview || null} label={item.name} type={item.type} size={36} />
                  <span className={'badge type-' + item.type}>{item.type}</span>
                  <b title={item.name} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </b>
                  {item.status === 'uploading' && <span className="muted small">…</span>}
                  {item.status === 'created' && <span className="badge good">ok</span>}
                  {item.status === 'failed' && <span className="badge bad">fail</span>}
                  <button
                    type="button"
                    className="ghost"
                    style={{ padding: '2px 6px' }}
                    onClick={() => removeAdHoc(item.localId)}
                    title="Remove from list"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div className="selected-chip add-chip" style={{ borderStyle: 'dashed', minWidth: 120 }}>
              <select
                value={adHocType}
                onChange={(e) => setAdHocType(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Image kis type ki hai"
              >
                <option value="product">product</option>
                <option value="brand">brand</option>
                <option value="character">character</option>
                <option value="environment">environment</option>
              </select>
            </div>
            <input
              type="text"
              value={adHocName}
              onChange={(e) => setAdHocName(e.target.value)}
              placeholder="Name (optional)"
              style={{
                maxWidth: 160,
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'inherit',
              }}
            />
            <label
              className="selected-chip add-chip"
              style={{
                cursor: adHocBusy ? 'wait' : 'pointer',
                borderStyle: 'dashed',
                opacity: adHocBusy ? 0.7 : 0.95,
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {adHocBusy ? 'Uploading…' : '+ Upload image…'}
              <input
                type="file"
                accept="image/*"
                onChange={onAdHocFile}
                disabled={adHocBusy}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
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
        <label>
          From image, only generate this (optional)
          <span className="muted small" style={{ fontWeight: 400, marginLeft: 8 }}>
            khali chhodo to full identity jaisa pehle
          </span>
        </label>
        <input
          value={form.focus}
          onChange={set('focus')}
          placeholder="e.g. mint boots only · navy polo cloth · face of left model · logo mark"
        />
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
          <div className="video-controls" style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>3. Video settings</h3>
            <p className="muted small" style={{ marginTop: 0 }}>
              Image se alag: duration + camera language + <b>Google Drive video link</b> + timestamps. Locks (character / product / brand / environment) upar se select karo.
            </p>
            <div className="two">
              <div>
                <label>Output duration (seconds)</label>
                <input type="number" min="2" max="30" value={form.duration} onChange={set('duration')} />
              </div>
              <div>
                <label>Motion language</label>
                <input
                  value={form.motion}
                  onChange={set('motion')}
                  placeholder="slow push-in, fabric sway, handheld energy…"
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 14, padding: 14, background: 'var(--surface-lo)' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Reference video — Google Drive / upload</strong>
                {refVideo && (
                  <button type="button" className="ghost" onClick={clearRefVideo} style={{ fontSize: 12 }}>
                    Remove
                  </button>
                )}
              </div>
              <p className="muted small" style={{ marginTop: 0 }}>
                <b>Drive access:</b> video Drive pe rakho → share <b>Anyone with the link</b> → link yahan paste.
                System usi link se reference read karke prompt banata hai — alag se Studio pe file upload zaroori nahi.
                Link yahan save rehta hai; neeche segments me timestamps + kya generate (character / product / brand / environment).
              </p>
              <label>Google Drive access link (share URL)</label>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <input
                  style={{ flex: 1, minWidth: 200 }}
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                />
                <button type="button" className="ghost" onClick={applyDriveLink} disabled={!driveUrl.trim()}>
                  Use link
                </button>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="muted small">or</span>
                <label
                  className="selected-chip add-chip"
                  style={{
                    cursor: 'pointer',
                    borderStyle: 'dashed',
                    display: 'inline-flex',
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  + Upload local video
                  <input type="file" accept="video/*" onChange={onRefVideo} style={{ display: 'none' }} />
                </label>
              </div>
              {!refVideo ? (
                <p className="muted small" style={{ margin: 0 }}>No reference video yet — prompt sirf locks se bhi ban sakta hai.</p>
              ) : (
                <div>
                  <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {refVideo.source === 'drive' ? (
                      <div className="video-ref-frame">
                        <iframe title="Drive video" src={refVideo.url} allow="autoplay" />
                      </div>
                    ) : (
                      <div className="video-ref-frame">
                        <video src={refVideo.url} controls />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{refVideo.name}</div>
                      <div className="muted small">
                        {refVideo.source === 'drive'
                          ? 'Google Drive reference'
                          : refVideo.duration != null
                            ? `${refVideo.duration}s total`
                            : 'Reading duration…'}
                      </div>
                      {refVideo.driveLink && (
                        <a className="muted small" href={refVideo.driveLink} target="_blank" rel="noreferrer">
                          Open in Drive ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 13 }}>Time segments — kya generate / extract</strong>
                      <button
                        type="button"
                        className="ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => setVideoSegments((list) => [...list, newSegment()])}
                      >
                        + Add segment
                      </button>
                    </div>
                    <p className="muted small" style={{ marginTop: 0 }}>
                      Har range pe select karo: character, product, brand, environment (ya mix). Prompt me har segment alag block banega.
                    </p>
                    {videoSegments.map((seg, idx) => (
                      <div
                        key={seg.id}
                        className="card"
                        style={{ padding: 12, marginBottom: 10, background: 'var(--surface)' }}
                      >
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                          <b style={{ fontSize: 12 }}>Segment {idx + 1}</b>
                          {videoSegments.length > 1 && (
                            <button
                              type="button"
                              className="ghost"
                              style={{ fontSize: 12, padding: '2px 8px' }}
                              onClick={() => setVideoSegments((list) => list.filter((x) => x.id !== seg.id))}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="two">
                          <div>
                            <label>Start (e.g. 0:05)</label>
                            <input
                              value={seg.start}
                              onChange={(e) =>
                                setVideoSegments((list) =>
                                  list.map((x) => (x.id === seg.id ? { ...x, start: e.target.value } : x))
                                )
                              }
                              placeholder="0:00"
                            />
                          </div>
                          <div>
                            <label>End (e.g. 0:18)</label>
                            <input
                              value={seg.end}
                              onChange={(e) =>
                                setVideoSegments((list) =>
                                  list.map((x) => (x.id === seg.id ? { ...x, end: e.target.value } : x))
                                )
                              }
                              placeholder="end"
                            />
                          </div>
                        </div>
                        <label style={{ marginTop: 8 }}>Is range me kya generate / focus</label>
                        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {SEGMENT_TYPES.map((tp) => {
                            const on = seg.extract.includes(tp);
                            return (
                              <button
                                key={tp}
                                type="button"
                                className={on ? '' : 'ghost'}
                                style={{ fontSize: 12, padding: '6px 12px', textTransform: 'capitalize' }}
                                onClick={() =>
                                  setVideoSegments((list) =>
                                    list.map((x) => {
                                      if (x.id !== seg.id) return x;
                                      const extract = on
                                        ? x.extract.filter((t) => t !== tp)
                                        : [...x.extract, tp];
                                      return { ...x, extract: extract.length ? extract : [tp] };
                                    })
                                  )
                                }
                              >
                                {on ? '✓ ' : ''}{tp}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="ghost"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() =>
                              setVideoSegments((list) =>
                                list.map((x) =>
                                  x.id === seg.id ? { ...x, extract: [...SEGMENT_TYPES] } : x
                                )
                              )
                            }
                          >
                            All 4
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

        <div className="row actions" style={{ marginTop: 20, gap: 14 }} data-tour="studio-actions">
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
                  {videoResult.duration || 5}s video prompt ready
                  <br />
                  <span className="muted small">
                    {videoResult.hasRefVideo
                      ? 'Reference video + timestamps included in prompt'
                      : 'Built from locked identities only'}
                  </span>
                </p>
              </div>
              {videoResult.timestamps && (
                <p className="muted small"><b>Segments:</b> {videoResult.timestamps}</p>
              )}
              {Array.isArray(videoResult.reference?.segments) && videoResult.reference.segments.length > 0 && (
                <ul className="muted small" style={{ marginTop: 6 }}>
                  {videoResult.reference.segments.map((s, i) => (
                    <li key={i}>
                      {s.start || '0:00'} → {s.end || 'end'}: {(s.extract || []).join(', ') || 'all'}
                    </li>
                  ))}
                </ul>
              )}
              {videoResult.note && <p className="muted small">{videoResult.note}</p>}
              {videoResult.reference?.url && (
                <p className="muted small">
                  <b>Ref video:</b>{' '}
                  <a href={videoResult.reference.url} target="_blank" rel="noreferrer">{videoResult.reference.url}</a>
                  {videoResult.reference.driveReachable === false && ' · (link may need “Anyone with the link”)'}
                </p>
              )}
              <div style={{ margin: '10px 0' }}>
                <button
                  className="btn primary"
                  disabled={videoFile?.busy}
                  onClick={async () => {
                    setVideoFile({ busy: true });
                    try {
                      const r = await api.generateVideo({ prompt: videoResult.prompt, aspectRatio: form.aspectRatio, duration: videoResult.duration });
                      setVideoFile({ url: r.url, seconds: r.seconds });
                    } catch (e) { setVideoFile({ error: e.message }); }
                  }}
                >
                  {videoFile?.busy ? 'Generating video… (1–3 min)' : '🎬 Generate video file'}
                </button>
                {videoFile?.error && <div className="err" style={{ marginTop: 8 }}>{videoFile.error}</div>}
                {videoFile?.url && (
                  <div style={{ marginTop: 10 }}>
                    <video src={assetUrl(videoFile.url)} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                    <p className="muted small">Ready in {videoFile.seconds}s · <a href={assetUrl(videoFile.url)} download target="_blank" rel="noreferrer">Download</a></p>
                  </div>
                )}
              </div>
              <details open>
                <summary>Full video prompt (copy to Runway / Kling / Luma)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{videoResult.prompt}</pre>
              </details>
            </>
          )}
          {videoResult.status === 'failed' && <div className="err">{videoResult.step}</div>}
        </div>
      )}

      {past.length > 0 && mode === 'image' && (
        <div className="card">
          <h2>Recent generations</h2>
          {past.slice(0, 12).map((g) => (
            <div className="row" key={g._id} style={{ justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {g.inputs?.goal || 'Generation'} · <span className={'badge ' + g.status}>{g.status}</span>
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button className="ghost" type="button" onClick={() => setActive(g)}>
                  Open
                </button>
                <button
                  className="ghost"
                  type="button"
                  title="Delete this generation"
                  style={{ color: 'var(--bad)' }}
                  onClick={async () => {
                    if (!window.confirm('Delete this generation?')) return;
                    try {
                      await api.generations.remove(g._id);
                      if (active?._id === g._id) setActive(null);
                      setPast((prev) => prev.filter((x) => x._id !== g._id));
                    } catch (e) {
                      setErr(e.message || 'Delete failed');
                    }
                  }}
                >
                  Delete
                </button>
              </div>
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
            {a.assetId && <Thumb className="thumb" src={assetUrl(a.assetId)} label={`attempt ${a.n}`} />}
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
