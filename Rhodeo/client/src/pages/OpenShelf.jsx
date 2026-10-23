import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CATEGORIES = ['product', 'character', 'environment', 'brand'];

function currentBody(p) {
  const v = p.versions?.find((x) => x.version === p.currentVersion) || p.versions?.[p.versions.length - 1];
  return v?.body || '';
}

export default function OpenShelf() {
  const [tab, setTab] = useState('assets');
  const [list, setList] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [kind, setKind] = useState('');
  const [category, setCategory] = useState('');
  const [groupFilter, setGroupFilter] = useState(''); // category key for group view
  const [groups, setGroups] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', body: '', tags: '' });
  const [busy, setBusy] = useState(false);

  const loadAssets = () => {
    const p = new URLSearchParams({ visibility: 'public' });
    if (category) p.set('category', category);
    if (q) p.set('q', q);
    api.assets.list(`?${p}`).then(setList).catch((e) => setErr(e.message));
  };

  const loadPrompts = () => {
    api.prompts.list('?visibility=public').then(setPrompts).catch((e) => setErr(e.message));
  };

  const loadGroups = () => {
    const p = new URLSearchParams({ visibility: 'public' });
    if (groupFilter) p.set('category', groupFilter);
    api.assets
      .duplicates(`?${p}`)
      .then(setGroups)
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    if (tab === 'assets') loadAssets();
    else if (tab === 'templates') loadPrompts();
    else loadGroups();
  }, [tab, category, groupFilter]);

  const toBank = async (id) => {
    await api.assets.setVisibility(id, 'private');
    setMsg('Moved to Asset Bank.');
    loadAssets();
  };

  const removeAsset = async (id) => {
    if (confirm('Delete this asset?')) {
      await api.assets.remove(id);
      loadAssets();
    }
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.prompts.create({
        name: form.name,
        body: form.body,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        visibility: 'public',
      });
      setForm({ name: '', body: '', tags: '' });
      setMsg('Public template created.');
      loadPrompts();
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  };

  const removePrompt = async (id) => {
    if (confirm('Delete template?')) {
      await api.prompts.remove(id);
      loadPrompts();
    }
  };

  const makePromptPrivate = async (id) => {
    await api.prompts.setVisibility(id, 'private');
    setMsg('Template moved to Prompt OS (private).');
    loadPrompts();
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text || '');
    setMsg('Copied.');
  };

  return (
    <>
      <h1>Open Shelf</h1>
      <p className="sub">
        Shared store for public assets and prompt templates. Filter by category (product, character, environment, brand)
        or browse similar groups within a category. Move items back to Asset Bank anytime.
      </p>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="tabs">
        <button type="button" className={tab === 'assets' ? '' : 'ghost'} onClick={() => setTab('assets')}>
          Shared assets
        </button>
        <button type="button" className={tab === 'groups' ? '' : 'ghost'} onClick={() => setTab('groups')}>
          Similar groups
        </button>
        <button type="button" className={tab === 'templates' ? '' : 'ghost'} onClick={() => setTab('templates')}>
          Prompt templates
        </button>
      </div>

      {tab === 'assets' && (
        <>
          <div className="card">
            <div className="row">
              <input
                style={{ width: 220 }}
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAssets()}
              />
              <select style={{ width: 160 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="ghost" onClick={loadAssets}>
                Search
              </button>
            </div>
          </div>
          <div className="grid grid-4">
            {list.map((a) => (
              <div className="card" key={a._id}>
                <img className="thumb" src={a.url} alt="" />
                <div className="row" style={{ marginTop: 8 }}>
                  <span className="badge">{a.kind}</span>
                  {a.category && <span className="badge public">{a.category}</span>}
                  <span className="badge public">shared</span>
                </div>
                {a.prompt && (
                  <details>
                    <summary>prompt</summary>
                    <pre>{a.prompt}</pre>
                  </details>
                )}
                <div className="muted small">
                  {a.width}×{a.height} · {new Date(a.createdAt).toLocaleDateString()}
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="ghost" onClick={() => toBank(a._id)}>
                    Move to Asset Bank
                  </button>
                  <button className="danger" onClick={() => removeAsset(a._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!list.length && (
              <p className="muted">No shared assets yet — move items from Asset Bank or Identity Lock.</p>
            )}
          </div>
        </>
      )}

      {tab === 'groups' && (
        <>
          <div className="card">
            <div className="row">
              <select style={{ width: 180 }} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="ghost" onClick={loadGroups}>
                Refresh groups
              </button>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Similar groups are built per category using visual hash clustering.
            </p>
          </div>
          {groups && (
            <div className="card">
              <h2>Groups ({groups.length})</h2>
              {!groups.length && <p className="muted">No similar groups for this category filter.</p>}
              {groups.map((g, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <span className="badge public">{g.category || 'uncategorized'}</span>
                    <span className="muted small">{g.assets?.length || 0} items</span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {(g.assets || []).map((a) => (
                      <div key={a._id}>
                        <img className="thumb" src={a.url} alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'templates' && (
        <>
          <form className="card" onSubmit={createTemplate}>
            <h2>New shared template</h2>
            <label>Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Summer lifestyle {{identity}}"
            />
            <label>
              Body (use {'{{identity}}'} {'{{scene}}'} {'{{style}}'})
            </label>
            <textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <label>Tags (comma)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <div className="row" style={{ marginTop: 12 }}>
              <button disabled={busy}>{busy ? 'Saving…' : 'Create shared template'}</button>
            </div>
          </form>

          <div className="grid big">
            {prompts.map((p) => (
              <div className="card" key={p._id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>{p.name}</b>
                  <span className="badge public">shared · v{p.currentVersion}</span>
                </div>
                {p.tags?.length > 0 && (
                  <div className="chips">
                    {p.tags.map((t) => (
                      <span className="chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="scroll" style={{ marginTop: 10, maxHeight: 160 }}>
                  {currentBody(p)}
                </pre>
                <div className="muted small">
                  {p.versions?.length || 0} versions · {new Date(p.updatedAt).toLocaleDateString()}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="ghost" onClick={() => copyText(currentBody(p))}>
                    Copy
                  </button>
                  <button className="ghost" onClick={() => makePromptPrivate(p._id)}>
                    Move to Prompt OS
                  </button>
                  <button className="danger" onClick={() => removePrompt(p._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!prompts.length && <p className="muted">No shared templates yet — create one above.</p>}
          </div>
        </>
      )}
    </>
  );
}
