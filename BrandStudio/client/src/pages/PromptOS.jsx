import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { TourProvider, GuideBar, Tip, EmptyHint } from '../components/Help.jsx';
import PageHeader from '../components/PageHeader.jsx';

const DEFAULT_BODY = `Create a campaign image.

IDENTITY (keep exactly consistent with the reference):
{{identity}}

ENVIRONMENT: {{environment}}
CAMPAIGN GOAL: {{goal}}
SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
AVOID: {{avoid}}`;

const VAR_KEYS = ['identity', 'environment', 'goal', 'scene', 'composition', 'style', 'avoid', 'brand', 'product', 'character', 'timestamps'];

const IMAGE_TYPES = ['product', 'character', 'brand', 'environment'];
const VIDEO_TYPES = ['character', 'product', 'brand', 'environment'];
const IDENTITY_TYPES = ['product', 'character', 'brand', 'environment'];

const DUMMY_PROMPTS = [
  {
    name: 'Product',
    tags: 'product',
    body: `Professional product photography of {{product}}.

IDENTITY LOCK: {{identity}}
SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Keep materials, logo placement, silhouette and proportions exactly as the locked product identity.
Soft studio key light, subtle rim, clean uncluttered background.
Avoid: {{avoid}}`,
  },
  {
    name: 'Character',
    tags: 'character',
    body: `Photoreal portrait of {{character}}.

IDENTITY LOCK: {{identity}}
SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Preserve exact face shape, hair, skin, glasses, outfit and signature details from the locked character identity.
Natural light, shallow depth of field, editorial mood.
Avoid: {{avoid}}`,
  },
  {
    name: 'Environment',
    tags: 'environment',
    body: `Wide establishing shot of {{environment}}.

IDENTITY LOCK: {{identity}}
SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Match architecture, materials, scale, lighting and camera language of the locked environment identity.
Cinematic grade, high detail; no extra people unless specified.
Avoid: {{avoid}}`,
  },
  {
    name: 'Brand',
    tags: 'brand',
    body: `Brand-consistent campaign frame featuring {{brand}}.

IDENTITY LOCK: {{identity}}
SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Hold logo geometry, brand colors, typography, visual style and campaign voice exactly as the locked brand identity.
Premium commercial look, sharp, no distortion.
Avoid: {{avoid}}`,
  },
  {
    name: 'Full Campaign Image',
    tags: 'character,product,brand,environment',
    body: `Campaign image with full identity locks.

CHARACTER: {{character}}
PRODUCT: {{product}}
BRAND: {{brand}}
ENVIRONMENT: {{environment}}
IDENTITY: {{identity}}

SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Keep every locked identity consistent — face, product, brand marks, place and look.
Avoid: {{avoid}}`,
  },
  {
    name: 'Video - Full Campaign',
    tags: 'character,product,brand,environment',
    body: `Create a brand-consistent video sequence.

CHARACTER: {{character}}
PRODUCT: {{product}}
BRAND: {{brand}}
ENVIRONMENT: {{environment}}

SCENE: {{scene}}
GOAL: {{goal}}
DURATION / TIMESTAMPS: {{timestamps}}
STYLE: {{style}}

Keep face, product, brand and environment locks consistent across every shot. Camera language from environment lock; voice and grade from brand lock.
Avoid: {{avoid}}`,
  },
  {
    name: 'Video - From Timestamp',
    tags: 'character,product,brand,environment',
    body: `Generate video prompt for the specified time range.

TIMESTAMPS: {{timestamps}}
CHARACTER: {{character}}
PRODUCT: {{product}}
BRAND: {{brand}}
ENVIRONMENT: {{environment}}

SCENE: {{scene}}
GOAL: {{goal}}
STYLE: {{style}}

Match locked identities for the reference segment. Environment drives camera; brand drives mood and message.
Avoid: {{avoid}}`,
  },
  {
    name: 'Video - Product Focus',
    tags: 'product,brand,environment',
    body: `Product video sequence.

PRODUCT LOCK: {{product}}
BRAND LOCK: {{brand}}
ENVIRONMENT LOCK: {{environment}}

SCENE: {{scene}}
GOAL: {{goal}}
TIMESTAMPS: {{timestamps}}
STYLE: {{style}}

Hero product stays identity-locked. Brand colors and voice stay locked. Camera / pacing from environment lock.
Avoid: {{avoid}}`,
  },
  {
    name: 'Video - Character Performance',
    tags: 'character,brand,environment',
    body: `Character-driven video.

CHARACTER LOCK: {{character}}
BRAND LOCK: {{brand}}
ENVIRONMENT LOCK: {{environment}}

SCENE: {{scene}}
GOAL: {{goal}}
TIMESTAMPS: {{timestamps}}
STYLE: {{style}}

Preserve exact character identity and performance. Brand voice for emotion; environment for camera and place.
Avoid: {{avoid}}`,
  },
];

function Diff({ a = '', b = '' }) {
  const other = new Set(b.split('\n'));
  return (
    <pre>
      {a.split('\n').map((l, i) => (
        <span key={i} className={'diffline' + (other.has(l) ? '' : ' chg')}>
          {l || ' '}
        </span>
      ))}
    </pre>
  );
}

/** Extract {{var}} names from template body */
function extractVars(body = '') {
  const found = new Set();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m;
  while ((m = re.exec(body))) found.add(m[1]);
  return [...found];
}

/** Replace {{key}} with values */
function renderTemplate(body, values) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (values[k] != null && values[k] !== '' ? values[k] : `{{${k}}}`));
}

const TOUR_STEPS = [
  {
    selector: '[data-tour="pos-saved"]',
    title: '1. Saved prompts (left)',
    body: 'All of your private templates list here. Click to open. If empty, use Fill dummy prompts for three examples.',
    why: '“Prompts = reusable creative assets.”',
  },
  {
    selector: '[data-tour="pos-new"]',
    title: '2. New prompt',
    body: 'Name + tags + template body. Use {{identity}} {{scene}} etc. Then fill values in the Live Fill section.',
    why: '“One structure for every campaign.”',
  },
  {
    selector: '[data-tour="pos-live"]',
    title: '3. Live Fill & Output',
    body: 'Text boxes for every {{variable}}. Type values → see final prompt instantly. No more manual {{ }} replacement.',
    why: '“Fill once, get clean output.”',
  },
];

const POS_CSS = `
/* Spatial: library TOP, editor below — more room */
.pos { display: flex; flex-direction: column; gap: 20px; min-width: 0; width: 100%; }
.pos-top { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.pos-mode-tabs {
  display: flex; gap: 8px; flex-wrap: wrap; max-width: 100%;
  background: rgba(120,120,128,.2); padding: 3px; border-radius: 11px;
  box-shadow: none;
}
.pos-mode-tab {
  flex: 1 1 140px; text-align: center; padding: 9px 16px; border-radius: 9px; border: none;
  background: transparent; color: var(--muted); font-weight: 600; font-size: 14px;
  cursor: pointer; transition: color .2s, background .2s, box-shadow .2s;
}
.pos-mode-tab:hover { color: var(--text); }
.pos-mode-tab.on {
  background: var(--surface-hi); color: var(--text);
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
}
.pos-type-groups { display: flex; flex-direction: column; gap: 14px; }
.pos-type-group-label {
  font-size: 13px; color: var(--muted); margin: 6px 0 8px; font-weight: 500;
}

.pos-type-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
@media (max-width: 600px) { .pos-type-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } }
@media (max-width: 380px) { .pos-type-row { grid-template-columns: 1fr; } }

.pos-type-card {
  text-align: left; background: var(--surface); color: var(--text);
  border-radius: var(--radius); padding: 14px 16px; cursor: pointer; border: 0.5px solid var(--separator); min-width: 0;
  box-shadow: var(--raise-sm), var(--edge);
  transition: transform .18s cubic-bezier(.25,.1,.25,1), box-shadow .2s;
}
.pos-type-card:hover:not(:disabled) { transform: none; background: var(--surface-hi); box-shadow: var(--raise); }
.pos-type-card.on {
  background: var(--accent-soft);
  border-color: var(--accent); box-shadow: none;
  transform: none;
}
.pos-type-card .pos-type-label { display: block; font-weight: 700; font-size: 14px; letter-spacing: -0.02em; text-transform: capitalize; margin-bottom: 4px; }
.pos-type-card.on .pos-type-label { color: var(--accent); }
.pos-type-card .pos-type-meta { font-size: 11px; color: var(--muted); }

.pos-panel {
  background: var(--surface); border: 0.5px solid var(--separator); border-radius: var(--radius); padding: 18px; min-width: 0;
  box-shadow: var(--raise), var(--edge);
}
.pos-panel h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 15px; }
.pos-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }

.pos-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.pos-search { flex: 1; min-width: 140px; margin: 0; }
.pos-list-h {
  display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px;
  -webkit-overflow-scrolling: touch; scrollbar-width: thin;
}
.pos-item {
  flex: 0 0 auto; min-width: 160px; max-width: 220px; text-align: left;
  background: var(--surface); color: var(--text);
  border-radius: 12px; padding: 12px 14px; font-weight: 500; cursor: pointer; border: 0.5px solid var(--separator);
  box-shadow: var(--raise-sm), var(--edge);
  transition: transform .18s cubic-bezier(.25,.1,.25,1), box-shadow .2s;
}
.pos-item:hover:not(:disabled) { transform: none; background: var(--surface-hi); box-shadow: var(--raise); }
.pos-item.on { background: var(--accent-soft); border-color: var(--accent); box-shadow: none; transform: none; }
.pos-item.on .pos-item-name { color: var(--accent); }
.pos-item-name { display: block; font-weight: 600; font-size: 13.5px; letter-spacing: -0.01em; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pos-item-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 11px; color: var(--muted); }
.pos-tag { font-size: 10.5px; padding: 2px 8px; border-radius: 99px; background: rgba(120,120,128,.24); box-shadow: none; color: var(--muted); text-transform: lowercase; }
.pos-empty { color: var(--muted); font-size: 12.5px; text-align: center; padding: 18px 12px; border-radius: 14px; background: var(--surface-lo); box-shadow: none; width: 100%; }

.pos-new-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; }
.pos-new-form { margin-top: 12px; }
.pos-new-form textarea { min-height: 120px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; width: 100%; }

.pos-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.pos-hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
.pos-hero-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
.pos-glyph { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--on-accent); background: linear-gradient(145deg, var(--accent), var(--accent-2)); box-shadow: none; flex: none; }
.pos-hero h2 { margin: 0 0 4px; font-size: 20px; letter-spacing: -0.03em; }
.pos-hero-sub { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pos-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.pos-seg { display: flex; gap: 6px; padding: 6px; width: fit-content; max-width: 100%; overflow-x: auto; background: rgba(120,120,128,.2); border-radius: 11px; box-shadow: none; }
.pos-seg button { background: transparent; color: var(--muted); box-shadow: none; filter: none; font-weight: 500; font-size: 13px; padding: 8px 16px; border-radius: 8px; white-space: nowrap; border: none; cursor: pointer; }
.pos-seg button:hover:not(:disabled) { color: var(--text); transform: none; box-shadow: none; filter: none; }
.pos-seg button:active:not(:disabled) { transform: scale(.97); }
.pos-seg button.on { background: var(--surface-hi); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.25); }

.pos-live { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
@media (max-width: 900px) {
  .pos-live { grid-template-columns: 1fr; }
  .pos-out { position: static; }
  .pos-panel { padding: 14px; border-radius: 16px; }
  .pos-hero h2 { font-size: 17px; }
  .pos-glyph { width: 42px; height: 42px; font-size: 18px; border-radius: 12px; }
  .pos-mode-tabs { width: 100%; }
  .pos-mode-tab { flex: 1; text-align: center; }
  .pos-seg { width: 100%; }
  .pos-seg button { flex: 1; }
  .pos-editor textarea { min-height: 200px; }
  .pos-out pre.prompt-output { max-height: 280px; min-height: 140px; }
}
.pos-progress { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; font-size: 12px; color: var(--muted); }
.pos-progress .progress-bar { flex: 1; margin-top: 0; }

.pos-vars { display: flex; flex-direction: column; gap: 12px; }
.pos-var label { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--muted); margin-bottom: 6px; }
.pos-var label code { text-transform: none; letter-spacing: 0; font-size: 11.5px; }
.pos-var .led { width: 8px; height: 8px; border-radius: 50%; background: var(--track); transition: background .2s, box-shadow .2s; }
.pos-var .led.on { background: var(--good); box-shadow: 0 0 8px var(--good); }
.pos-var textarea { min-height: 64px; font-size: 13px; width: 100%; }

.pos-out { position: sticky; top: 14px; }
.pos-out-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.pos-out-head h3 { margin: 0; font-size: 14px; }
.pos-out pre.prompt-output { max-height: 420px; margin: 0; min-height: 200px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; overflow: auto; }
.pos-out-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 11.5px; color: var(--muted); flex-wrap: wrap; }
.pos-ph { color: var(--warn); }

.pos-editor textarea { min-height: 280px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.6; width: 100%; }
.pos-chipbar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center; }
.pos-vers { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
.pos-vers button { padding: 8px 14px; font-size: 12.5px; }
.pos-cmp { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 16px 0; color: var(--muted); }
.pos-cmp select { width: 90px; }
`;

function PromptOSInner() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ name: '', body: DEFAULT_BODY, tags: '' });
  const [edit, setEdit] = useState({ body: '', note: '' });
  const [cmp, setCmp] = useState({ a: '', b: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [varValues, setVarValues] = useState({});
  const [tab, setTab] = useState('live');
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(true);
  const [copied, setCopied] = useState(false);
  const [typeFilter, setTypeFilter] = useState(''); // product | character | ...
  const [osMode, setOsMode] = useState('image'); // 'image' | 'video'

  const load = async (keep) => {
    const l = await api.prompts.list('?visibility=private');
    setList(l);
    const cur = l.find((p) => p._id === (keep || sel?._id));
    if (cur) pick(cur);
  };

  const pick = (p) => {
    setSel(p);
    const v = p.versions.find((x) => x.version === p.currentVersion);
    setEdit({ body: v?.body || '', note: '' });
    setCmp({ a: String(Math.max(1, p.currentVersion - 1)), b: String(p.currentVersion) });
    // reset values but keep previous keys that still exist
    const vars = extractVars(v?.body || '');
    setVarValues((prev) => {
      const next = {};
      vars.forEach((k) => { next[k] = prev[k] || ''; });
      return next;
    });
  };

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  const guard = (fn) => async () => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const create = guard(async () => {
    const p = await api.prompts.create({
      name: draft.name,
      body: draft.body,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setDraft({ name: '', body: DEFAULT_BODY, tags: '' });
    await load(p._id);
  });

  const saveVersion = guard(async () => {
    const p = await api.prompts.addVersion(sel._id, edit);
    await load(p._id);
  });

  const remove = guard(async () => {
    if (!confirm('Delete prompt?')) return;
    await api.prompts.remove(sel._id);
    setSel(null);
    await load();
  });

  const makePublic = guard(async () => {
    await api.prompts.setVisibility(sel._id, 'public');
    await load(sel._id);
  });

  const setCurrent = (v) =>
    guard(async () => {
      await api.prompts.setCurrent(sel._id, v);
      await load(sel._id);
    })();

  const fillDummy = guard(async () => {
    let last = null;
    const isVideoDummy = (d) =>
      /video/i.test(d.name) || /\bvideo\b/i.test(d.tags || '');
    const pool = DUMMY_PROMPTS.filter((d) =>
      osMode === 'video' ? isVideoDummy(d) : !isVideoDummy(d)
    );
    for (const d of pool) {
      const existing = list.find((p) => p.name === d.name);
      if (existing) {
        last = existing;
        continue;
      }
      last = await api.prompts.create({
        name: d.name,
        body: d.body,
        tags: d.tags.split(',').map((t) => t.trim()),
      });
    }
    await load(last?._id);
  });

  const fillDraftDummy = () => {
    setDraft({
      name: 'Social square promo',
      tags: 'social,1:1,promo',
      body: DEFAULT_BODY + '\n\nAspect: 1:1. High sharpness, no watermark, no extra text.',
    });
  };

  const activeBody = sel ? edit.body : draft.body;
  const detectedVars = useMemo(() => extractVars(activeBody), [activeBody]);
  const rendered = useMemo(() => renderTemplate(activeBody, varValues), [activeBody, varValues]);

  const setVar = (k, v) => setVarValues((prev) => ({ ...prev, [k]: v }));

  const fillSampleValues = () => {
    setVarValues({
      identity: 'Young woman in navy polo, khaki wide pants, mint boots — face locked from reference',
      environment: 'Vast orange desert at sunset, distant mountains, warm dramatic sky',
      goal: 'Instagram carousel hero for summer adventure drop',
      scene: 'Wide desert dunes under fiery orange sky, golden hour light',
      composition: 'Four models spaced across frame, low angle, cinematic 35mm',
      style: 'Premium commercial, warm tones, high detail, subtle film grain',
      avoid: 'crowd, text overlay, watermark, distorted faces',
      brand: 'Clean logo placement on polo, consistent brand colors',
      product: 'Mint lace-up boots, rope prop, exact material & sole',
      character: 'Four diverse models, exact faces & outfits from locked identities',
      timestamps: '0:08 → 0:22',
    });
  };

  const copyOut = () => {
    navigator.clipboard.writeText(rendered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const va = sel?.versions.find((v) => v.version === Number(cmp.a));
  const vb = sel?.versions.find((v) => v.version === Number(cmp.b));

  const isVideoPrompt = (p) => {
    const tags = (p.tags || []).map((x) => String(x).toLowerCase());
    const name = (p.name || '').toLowerCase();
    return tags.includes('video') || /video/.test(name);
  };
  const filtered = list.filter((p) => {
    const s = q.trim().toLowerCase();
    const tags = (p.tags || []).map((t) => String(t).toLowerCase());
    // respect Image / Video tab
    if (osMode === 'video' && !isVideoPrompt(p)) return false;
    if (osMode === 'image' && isVideoPrompt(p)) return false;
    if (typeFilter && !tags.includes(typeFilter) && p.name.toLowerCase() !== typeFilter) return false;
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || tags.some((t) => t.includes(s));
  });
  const countByType = (t) =>
    list.filter((p) => {
      const tags = (p.tags || []).map((x) => String(x).toLowerCase());
      return tags.includes(t) || p.name.toLowerCase() === t;
    }).length;
  const filled = detectedVars.filter((k) => (varValues[k] || '').trim()).length;
  const pct = detectedVars.length ? Math.round((filled / detectedVars.length) * 100) : 0;
  const leftover = (rendered.match(/\{\{\s*\w+\s*\}\}/g) || []).length;

  return (
    <>
      <style>{POS_CSS}</style>
      <PageHeader
        title="Prompt OS"
        subtitle={osMode === "image" ? "Prompt OS Image — Product · Character · Brand · Environment" : "Prompt OS Video — Character · Product · Brand · Environment + timestamps"}
        onDelete={sel ? remove : undefined}
        deleteLabel="Delete this prompt"
        showDelete={!!sel}
      />

      <GuideBar onDummy={fillDummy} dummyLabel="Fill dummy prompts" />
      {err && <div className="err">{err}</div>}

      <div className="pos">
        {/* ============ TOP: Image / Video tabs + types ============ */}
        <div className="pos-top">
          <div className="pos-mode-tabs" data-tour="pos-saved">
            <button
              type="button"
              className={'pos-mode-tab' + (osMode === 'image' ? ' on' : '')}
              onClick={() => { setOsMode('image'); setTypeFilter(''); }}
            >
              Prompt OS Image
            </button>
            <button
              type="button"
              className={'pos-mode-tab' + (osMode === 'video' ? ' on' : '')}
              onClick={() => { setOsMode('video'); setTypeFilter(''); }}
            >
              Prompt OS Video
            </button>
          </div>

          <div className="pos-type-groups">
            <div className="pos-type-group">
              <div className="pos-type-group-label">
                {osMode === 'image' ? 'Image locks' : 'Video locks'}
                <span style={{fontWeight:400, opacity:0.7, marginLeft:8}}>
                  {osMode === 'image' ? 'Style + Voice included' : 'Style + Voice + Motion + full identities'}
                </span>
              </div>
              <div className="pos-type-row">
                {(osMode === 'image' ? IMAGE_TYPES : VIDEO_TYPES).map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={'pos-type-card' + (typeFilter === t ? ' on' : '')}
                    onClick={() => setTypeFilter((cur) => (cur === t ? '' : t))}
                    title={typeFilter === t ? 'Clear filter' : `Filter: ${t}`}
                  >
                    <span className="pos-type-label">{t}</span>
                    <span className="pos-type-meta">{countByType(t)} template{countByType(t) === 1 ? '' : 's'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pos-panel">
            <div className="pos-panel-head">
              <h2>Library {typeFilter ? <span className="badge">{typeFilter}</span> : null}</h2>
              <span className="badge">{filtered.length}/{list.length}</span>
            </div>
            <div className="pos-toolbar">
              <input
                className="pos-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or tag…"
              />
              <button type="button" className="ghost" onClick={() => setShowNew((s) => !s)}>
                {showNew ? 'Hide new' : '＋ New prompt'}
              </button>
            </div>
            <div className="pos-list-h">
              {filtered.map((p) => (
                <button
                  type="button"
                  key={p._id}
                  className={'pos-item' + (sel?._id === p._id ? ' on' : '')}
                  onClick={() => pick(p)}
                >
                  <span className="pos-item-name">{p.name}</span>
                  <span className="pos-item-meta">
                    <span className="badge good">v{p.currentVersion}</span>
                    {p.tags?.slice(0, 2).map((t) => (
                      <span className="pos-tag" key={t}>{t}</span>
                    ))}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <div className="pos-empty">
                  {list.length
                    ? 'No match for this filter.'
                    : (osMode === 'image' ? 'No prompts yet — Fill Image dummy prompts.' : 'No prompts yet — Fill Video dummy prompts.')}
                </div>
              )}
            </div>
            {showNew && (
              <div className="pos-new-form" data-tour="pos-new">
                <div className="row" style={{ marginBottom: 4 }}>
                  <Tip id="pos.new" />
                  <button type="button" className="ghost dummy-btn" onClick={fillDraftDummy}>
                    Fill form dummy
                  </button>
                </div>
                <label>Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Product"
                />
                <label>Type tag (Image or Video: product / character / brand / environment)</label>
                <input
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="product"
                />
                <label>Template — use {'{{identity}}'} {'{{scene}}'}</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
                <div className="row" style={{ marginTop: 14 }}>
                  <button disabled={!draft.name || !draft.body || busy} onClick={create}>
                    Create prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ MAIN EDITOR ============ */}
        <section className="pos-main" data-tour="pos-detail">
          {!sel ? (
            <EmptyHint
              title="Upar se prompt select karo"
              body="IMAGE ya VIDEO group se filter karo. Video templates mein timestamp + Style + Voice + Motion sab cover hota hai."
              why="“Image locks upar, Video locks neeche.”"
            >
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" className="ghost dummy-btn" onClick={fillDummy} disabled={busy}>
                  {osMode === 'image' ? 'Fill Image dummy prompts' : 'Fill Video dummy prompts'}
                </button>
              </div>
            </EmptyHint>
          ) : (
            <>
              <div className="pos-panel pos-hero">
                <div className="pos-hero-title">
                  <div className="pos-glyph">✦</div>
                  <div style={{ minWidth: 0 }}>
                    <h2>{sel.name}</h2>
                    <div className="pos-hero-sub">
                      <span className="badge good">current v{sel.currentVersion}</span>
                      {sel.tags?.map((t) => (
                        <span className="pos-tag" key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pos-hero-actions">
                  <button className="ghost" onClick={makePublic} disabled={busy}>
                    Make public
                  </button>
                </div>
              </div>

              <div className="pos-seg" role="tablist">
                {[
                  ['live', '⚡ Live Fill'],
                  ['edit', '✎ Template'],
                  ['hist', '⟲ History'],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    className={tab === k ? 'on' : ''}
                    onClick={() => setTab(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ---- LIVE FILL ---- */}
              {tab === 'live' && (
                <div className="pos-live" data-tour="pos-live">
                  <div className="pos-panel">
                    <div className="pos-panel-head">
                      <h2>Variables</h2>
                      <button type="button" className="ghost dummy-btn" onClick={fillSampleValues}>
                        Fill sample values
                      </button>
                    </div>
                    {detectedVars.length === 0 ? (
                      <div className="pos-empty">No {'{{variables}}'} found in this template.</div>
                    ) : (
                      <>
                        <div className="pos-progress">
                          <span>{filled}/{detectedVars.length} filled</span>
                          <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>
                        </div>
                        <div className="pos-vars">
                          {detectedVars.map((k) => (
                            <div key={k} className="pos-var">
                              <label>
                                <code>{'{{' + k + '}}'}</code>
                                <span className={'led' + ((varValues[k] || '').trim() ? ' on' : '')} />
                              </label>
                              <textarea
                                rows={2}
                                value={varValues[k] || ''}
                                onChange={(e) => setVar(k, e.target.value)}
                                placeholder={`Enter value for ${k}…`}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pos-panel pos-out">
                    <div className="pos-out-head">
                      <h3>Output</h3>
                      <button type="button" onClick={copyOut}>
                        {copied ? '✓ Copied' : 'Copy output'}
                      </button>
                    </div>
                    <pre className="prompt-output">{rendered}</pre>
                    <div className="pos-out-foot">
                      <span>{rendered.length} chars</span>
                      <span className={leftover ? 'pos-ph' : ''}>
                        {leftover ? `${leftover} placeholder(s) left` : 'All placeholders filled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- TEMPLATE EDITOR ---- */}
              {tab === 'edit' && (
                <div className="pos-panel pos-editor">
                  <div className="pos-panel-head">
                    <h2>Template body</h2>
                  </div>
                  <textarea
                    value={edit.body}
                    onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                  />
                  <div className="pos-chipbar">
                    <span className="muted small">Detected:</span>
                    {detectedVars.map((k) => (
                      <code key={k}>{'{{' + k + '}}'}</code>
                    ))}
                    {!detectedVars.length && <span className="muted small">none</span>}
                  </div>
                  <label>Version note</label>
                  <input
                    value={edit.note}
                    onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                    placeholder="what changed?"
                  />
                  <div className="row" style={{ marginTop: 16 }}>
                    <button onClick={saveVersion} disabled={busy}>
                      Save new version
                    </button>
                  </div>
                </div>
              )}

              {/* ---- HISTORY ---- */}
              {tab === 'hist' && (
                <div className="pos-panel">
                  <div className="pos-panel-head">
                    <h2>History &amp; comparison</h2>
                    <span className="muted small">click a version = make current</span>
                  </div>
                  <div className="pos-vers">
                    {sel.versions.map((v) => (
                      <button
                        key={v.version}
                        className={v.version === sel.currentVersion ? '' : 'ghost'}
                        title={v.note || ''}
                        onClick={() => setCurrent(v.version)}
                      >
                        v{v.version}
                      </button>
                    ))}
                  </div>
                  <div className="pos-cmp">
                    <span>Compare</span>
                    <select value={cmp.a} onChange={(e) => setCmp({ ...cmp, a: e.target.value })}>
                      {sel.versions.map((v) => (
                        <option key={v.version}>{v.version}</option>
                      ))}
                    </select>
                    <span>vs</span>
                    <select value={cmp.b} onChange={(e) => setCmp({ ...cmp, b: e.target.value })}>
                      {sel.versions.map((v) => (
                        <option key={v.version}>{v.version}</option>
                      ))}
                    </select>
                  </div>
                  <div className="two">
                    <div>
                      <div className="muted small">
                        v{cmp.a} {va?.note && `· ${va.note}`}
                      </div>
                      <Diff a={va?.body} b={vb?.body} />
                    </div>
                    <div>
                      <div className="muted small">
                        v{cmp.b} {vb?.note && `· ${vb.note}`}
                      </div>
                      <Diff a={vb?.body} b={va?.body} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default function PromptOS() {
  return (
    <TourProvider steps={TOUR_STEPS}>
      <PromptOSInner />
    </TourProvider>
  );
}