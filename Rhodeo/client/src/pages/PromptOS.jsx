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

const VAR_KEYS = ['identity', 'environment', 'goal', 'scene', 'composition', 'style', 'avoid', 'brand', 'product', 'character'];

const DUMMY_PROMPTS = [
  {
    name: 'Hero product shot',
    tags: 'product,hero,ecommerce',
    body: `Professional product photography of {{identity}}.

SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Keep materials, logo placement, and proportions exactly as the locked identity.
Lighting: soft studio key light, subtle rim. Background clean and uncluttered.
Avoid: {{avoid}}`,
  },
  {
    name: 'Lifestyle character',
    tags: 'character,lifestyle,social',
    body: `Photoreal portrait of {{identity}} in a natural setting.

SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Preserve exact face shape, hair, glasses, and signature details from the identity lock.
Warm natural light, shallow depth of field, editorial mood.
Avoid: {{avoid}}`,
  },
  {
    name: 'Brand environment',
    tags: 'environment,brand,campaign',
    body: `Wide establishing shot of {{identity}} as the hero environment.

SCENE: {{scene}}
COMPOSITION: {{composition}}
STYLE: {{style}}
GOAL: {{goal}}

Match architecture, materials, and lighting language of the locked environment identity.
Cinematic color grade, high detail, no people unless specified.
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
.pos { display: grid; grid-template-columns: 310px minmax(0, 1fr); gap: 22px; align-items: start; }
@media (max-width: 1000px) { .pos { grid-template-columns: 1fr; } }

.pos-rail { position: sticky; top: 14px; display: flex; flex-direction: column; gap: 18px; max-height: calc(100vh - 28px); }
.pos-panel { background: var(--surface, #202431); border-radius: 22px; padding: 18px; box-shadow: var(--raise, 8px 8px 20px rgba(7,9,15,.65), -6px -6px 16px rgba(255,255,255,.06)), var(--edge, inset 0 1px 0 rgba(255,255,255,.11)); }
.pos-panel h2 { margin: 0; display: flex; align-items: center; gap: 8px; }
.pos-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }

.pos-search { margin-bottom: 12px; }
.pos-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: 340px; padding: 4px 6px 8px 2px; margin: 0 -6px 0 -2px; }
.pos-item { display: block; width: 100%; text-align: left; background: var(--surface, #202431); color: var(--text, #eceff8); border-radius: 16px; padding: 12px 14px; font-weight: 500; cursor: pointer; box-shadow: var(--raise-sm, 4px 4px 10px rgba(7,9,15,.4), -3px -3px 8px rgba(255,255,255,.06)), var(--edge, inset 0 1px 0 rgba(255,255,255,.11)); transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .2s; }
.pos-item:hover:not(:disabled) { transform: translateY(-2px); filter: none; box-shadow: var(--raise, 8px 8px 20px rgba(7,9,15,.65), -6px -6px 16px rgba(255,255,255,.06)); }
.pos-item.on { background: var(--surface-lo, #181b25); box-shadow: var(--press, inset 4px 4px 9px rgba(7,9,15,.65), inset -3px -3px 8px rgba(255,255,255,.06)); transform: none; }
.pos-item.on .pos-item-name { color: var(--accent, #8eb4ff); }
.pos-item-name { display: block; font-weight: 600; font-size: 13.5px; letter-spacing: -0.01em; margin-bottom: 6px; }
.pos-item-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 11px; color: var(--muted, #98a1b8); }
.pos-tag { font-size: 10.5px; padding: 2px 8px; border-radius: 99px; background: var(--surface-lo, #181b25); box-shadow: var(--press-sm, inset 2px 2px 6px rgba(7,9,15,.65), inset -2px -2px 5px rgba(255,255,255,.06)); color: var(--muted, #98a1b8); }
.pos-empty { color: var(--muted, #98a1b8); font-size: 12.5px; text-align: center; padding: 18px 8px; border-radius: 14px; background: var(--surface-lo, #181b25); box-shadow: var(--press-sm, inset 2px 2px 6px rgba(7,9,15,.65)); }

.pos-new-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; }
.pos-new-form { margin-top: 12px; }
.pos-new-form textarea { min-height: 120px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }

/* main */
.pos-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.pos-hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
.pos-hero-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
.pos-glyph { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #0c0f1a; background: linear-gradient(145deg, #9bbcff, #a58bfa); box-shadow: var(--raise-sm, 4px 4px 10px rgba(7,9,15,.4)), inset 0 1px 0 rgba(255,255,255,.5); flex: none; }
.pos-hero h2 { margin: 0 0 4px; font-size: 20px; letter-spacing: -0.03em; }
.pos-hero-sub { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pos-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.pos-seg { display: flex; gap: 6px; padding: 6px; width: fit-content; max-width: 100%; overflow-x: auto; background: var(--surface-lo, #181b25); border-radius: 18px; box-shadow: var(--press, inset 4px 4px 9px rgba(7,9,15,.65), inset -3px -3px 8px rgba(255,255,255,.06)); }
.pos-seg button { background: transparent; color: var(--muted, #98a1b8); box-shadow: none; filter: none; font-weight: 500; font-size: 13px; padding: 9px 16px; border-radius: 13px; white-space: nowrap; }
.pos-seg button:hover:not(:disabled) { color: var(--text, #eceff8); transform: none; box-shadow: none; filter: none; }
.pos-seg button:active:not(:disabled) { transform: scale(.97); box-shadow: none; filter: none; }
.pos-seg button.on { background: var(--surface-hi, #262b3a); color: var(--accent, #8eb4ff); box-shadow: var(--raise-sm, 4px 4px 10px rgba(7,9,15,.4), -3px -3px 8px rgba(255,255,255,.06)), var(--edge, inset 0 1px 0 rgba(255,255,255,.11)); }

/* live fill */
.pos-live { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 18px; align-items: start; }
@media (max-width: 1250px) { .pos-live { grid-template-columns: 1fr; } }
.pos-progress { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; font-size: 12px; color: var(--muted, #98a1b8); }
.pos-progress .progress-bar { flex: 1; margin-top: 0; }
.pos-vars { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
.pos-var { position: relative; }
.pos-var label { display: flex; align-items: center; justify-content: space-between; margin: 0 0 6px; }
.pos-var label code { text-transform: none; letter-spacing: 0; font-size: 11.5px; }
.pos-var .led { width: 8px; height: 8px; border-radius: 50%; background: #343a4d; box-shadow: inset 1px 1px 2px rgba(0,0,0,.5); transition: background .2s, box-shadow .2s; }
.pos-var .led.on { background: var(--good, #4ade9b); box-shadow: 0 0 8px var(--good, #4ade9b); }
.pos-var textarea { min-height: 64px; font-size: 13px; }

.pos-out { position: sticky; top: 14px; }
.pos-out-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.pos-out-head h3 { margin: 0; font-size: 14px; }
.pos-out pre.prompt-output { max-height: 420px; margin: 0; min-height: 200px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
.pos-out-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 11.5px; color: var(--muted, #98a1b8); }
.pos-ph { color: var(--warn, #fbbf24); }

/* editor */
.pos-editor textarea { min-height: 280px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.6; }
.pos-chipbar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center; }

/* history */
.pos-vers { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
.pos-vers button { padding: 8px 14px; font-size: 12.5px; }
.pos-cmp { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 16px 0; color: var(--muted, #98a1b8); }
.pos-cmp select { width: 90px; }
pre .diffline { display: block; padding: 0 6px; margin: 0 -6px; border-radius: 4px; }
pre .diffline.chg { background: rgba(251, 191, 36, 0.14); color: #fde68a; box-shadow: inset 3px 0 0 var(--warn, #fbbf24); }
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
    for (const d of DUMMY_PROMPTS) {
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
    });
  };

  const copyOut = () => {
    navigator.clipboard.writeText(rendered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const va = sel?.versions.find((v) => v.version === Number(cmp.a));
  const vb = sel?.versions.find((v) => v.version === Number(cmp.b));

  const filtered = list.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || (p.tags || []).some((t) => t.toLowerCase().includes(s));
  });
  const filled = detectedVars.filter((k) => (varValues[k] || '').trim()).length;
  const pct = detectedVars.length ? Math.round((filled / detectedVars.length) * 100) : 0;
  const leftover = (rendered.match(/\{\{\s*\w+\s*\}\}/g) || []).length;

  return (
    <>
      <style>{POS_CSS}</style>
      <PageHeader
        title="Prompt OS"
        subtitle="Templates + Live Fill. Enter values in text boxes → get clean prompt output. No more manual {{ }} replacement."
        onDelete={sel ? remove : undefined}
        deleteLabel="Delete this prompt"
        showDelete={!!sel}
      />

      <GuideBar onDummy={fillDummy} dummyLabel="Fill dummy prompts" />
      {err && <div className="err">{err}</div>}

      <div className="pos">
        {/* ============ LEFT RAIL ============ */}
        <aside className="pos-rail">
          <div className="pos-panel" data-tour="pos-saved">
            <div className="pos-panel-head">
              <h2>Library</h2>
              <span className="badge">{list.length}</span>
            </div>
            <input
              className="pos-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or tag…"
            />
            <div className="pos-list">
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
                    <span>{p.versions.length} ver.</span>
                    {p.tags?.slice(0, 3).map((t) => (
                      <span className="pos-tag" key={t}>{t}</span>
                    ))}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <div className="pos-empty">
                  {list.length ? 'No match.' : 'No prompts yet. Use Fill dummy prompts or create one below.'}
                </div>
              )}
            </div>
          </div>

          <div className="pos-panel" data-tour="pos-new">
            <button
              type="button"
              className="ghost pos-new-toggle"
              onClick={() => setShowNew((s) => !s)}
            >
              <span>＋ New prompt</span>
              <span>{showNew ? '–' : '+'}</span>
            </button>
            {showNew && (
              <div className="pos-new-form">
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
                  placeholder="e.g. Hero product shot"
                />
                <label>Tags (comma separated)</label>
                <input
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="product, hero"
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
        </aside>

        {/* ============ MAIN ============ */}
        <section className="pos-main" data-tour="pos-detail">
          {!sel ? (
            <EmptyHint
              title="Left se prompt select karo"
              body="Choose a template from the library, or create three examples with Fill dummy prompts. After select you can edit and use Live Fill."
              why="“Empty screen confuse na kare — pehla step clear ho.”"
            >
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" className="ghost dummy-btn" onClick={fillDummy} disabled={busy}>
                  Fill dummy prompts
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