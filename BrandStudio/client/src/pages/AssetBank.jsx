import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Thumb, { assetUrl } from '../components/Thumb.jsx';
import CreateGroup from '../components/CreateGroup.jsx';
import GroupList from '../components/GroupList.jsx';
import PageHeader from '../components/PageHeader.jsx';

const CATEGORIES = ['product', 'character', 'environment', 'brand'];

export default function AssetBank() {
  const [list, setList] = useState([]);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [searchMode, setSearchMode] = useState('text');
  const [groups, setGroups] = useState(null);
  const [namedGroups, setNamedGroups] = useState([]);
  const [uploadCat, setUploadCat] = useState('product');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    const p = new URLSearchParams({ visibility: 'private' });
    if (category) p.set('category', category);
    if (q) p.set('q', q);
    const query = `?${p}`;
    (searchMode === 'semantic' ? api.assets.search(query) : api.assets.list(query)).then(setList).catch((e) => setErr(e.message));
  };

  const loadNamed = () =>
    api.groups.list('?visibility=private').then(setNamedGroups).catch(() => {});

  useEffect(() => {
    load();
    loadNamed();
  }, [category, searchMode]);

  const upload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('image', f);
      fd.append('visibility', 'private');
      fd.append('category', uploadCat);
      const r = await api.assets.upload(fd);
      setMsg(
        r.duplicate
          ? 'Exact duplicate — already in the bank.'
          : r.similarTo
            ? 'Uploaded (visually similar asset exists).'
            : 'Saved to Asset Bank.'
      );
      load();
    } catch (e2) {
      setErr(e2.message);
    }
    e.target.value = '';
  };

  const remove = async (id) => {
    if (confirm('Delete this asset?')) {
      await api.assets.remove(id);
      load();
      if (groups) findDupes();
    }
  };

  const toShelf = async (id) => {
    await api.assets.setVisibility(id, 'public');
    setMsg('Moved to Public Assets.');
    load();
  };

  const findDupes = () => {
    const p = new URLSearchParams({ visibility: 'private' });
    if (category) p.set('category', category);
    api.assets
      .duplicates(`?${p}`)
      .then(setGroups)
      .catch((e) => setErr(e.message));
  };

  return (
    <>
      <PageHeader title="Asset Bank" subtitle="Private store. Filter by product, character, environment, brand." showDelete={true} />
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="section-gap">
        <CreateGroup visibility="private" defaultType={uploadCat || 'product'} onCreated={() => loadNamed()} />
      </div>

      <div className="card">
        <div className="row">
          <input
            style={{ width: 220 }}
            placeholder={searchMode === 'semantic' ? 'Describe what you want to find…' : 'Search prompt / filename'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select style={{ width: 160 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select style={{ width: 170 }} value={searchMode} onChange={(e) => setSearchMode(e.target.value)} aria-label="Search mode">
            <option value="text">Text search</option>
            <option value="semantic">Semantic search</option>
          </select>
          <button className="ghost" onClick={load}>
            Search
          </button>
          <button className="ghost" onClick={findDupes}>
            Find similar groups
          </button>
        </div>
        {searchMode === 'semantic' && <p className="muted small">Semantic mode ranks by Ollama embeddings when available; otherwise it uses local text relevance. Existing assets may need re-upload or re-indexing to store embeddings.</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <span className="muted small" style={{ whiteSpace: 'nowrap' }}>Upload as</span>
          <select style={{ width: 160 }} value={uploadCat} onChange={(e) => setUploadCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input style={{ width: 280 }} type="file" accept="image/*" onChange={upload} />
        </div>
      </div>

      <GroupList visibility="private" title="Groups" />

      {groups && (
        <div className="card">
          <h2>Similar groups ({groups.length})</h2>
          <p className="muted small">Clustered by category, then visual similarity.</p>
          {!groups.length && <p className="muted">No similar groups for this filter.</p>}
          {groups.map((g, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="badge public">{g.category || 'uncategorized'}</span>
                <span className="muted small">{g.assets?.length || 0} items</span>
              </div>
              <div className="grid grid-4">
                {(g.assets || []).map((a) => (
                  <div key={a._id}>
                    <Thumb className="thumb" src={assetUrl(a)} label={a.category || a.filename || "asset"} type={a.category || ""} />
                    <button className="danger" style={{ marginTop: 10, width: '100%' }} onClick={() => remove(a._id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-4 asset-grid">
        {list.map((a) => {
          const isSelfUpload = a.kind === 'upload';
          return (
            <div className="card asset-card" key={a._id}>
              <Thumb className="thumb" src={assetUrl(a)} label={a.category || a.filename || "asset"} type={a.category || ""} />
              <div className="row">
                <span className="badge">{a.kind}</span>
                {a.category && <span className="badge public">{a.category}</span>}
              </div>
              <div className="muted small">
                {a.width}×{a.height} · {new Date(a.createdAt).toLocaleDateString()} {typeof a.relevance === 'number' ? `· relevance ${a.relevance}` : ''}
              </div>
              {a.prompt && (
                <details>
                  <summary>prompt</summary>
                  <pre>{a.prompt}</pre>
                </details>
              )}
              <div className="asset-actions">
                {!isSelfUpload && (
                  <button type="button" onClick={() => toShelf(a._id)}>
                    Move to Public Assets
                  </button>
                )}
                <button className="danger" onClick={() => remove(a._id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {!list.length && <p className="muted" style={{ gridColumn: '1 / -1' }}>Asset Bank is empty.</p>}
      </div>
    </>
  );
}
