import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import LockMeter from '../components/LockMeter.jsx';
import { TourProvider, GuideBar, Tip, EmptyHint } from '../components/Help.jsx';
import CreateGroup from '../components/CreateGroup.jsx';
import PageHeader from '../components/PageHeader.jsx';

const TYPES = ['product', 'character', 'environment', 'brand'];

const DUMMY_FORM = {
  name: 'Matte Teal Bottle',
  type: 'product',
  description: 'Matte teal stainless steel bottle, logo etched on left side, brushed metal cap',
};

const TOUR_STEPS = [
  {
    selector: '[data-tour="id-create"]',
    title: '1. New identity',
    body: 'Name + one of four types + reference image. Choose Asset Bank (private) or Open Shelf (shared). Create & analyse extracts a vision profile.',
    why: '“Reference → structured profile → Lock = identity asset.”',
  },
  {
    selector: '[data-tour="id-list"]',
    title: '2. Identity list',
    body: 'Open a card to review fields and Lock. Only locked identities appear in Studio.',
    why: '“Draft vs locked — avoid accidental changes.”',
  },
];

function IdentitiesInner() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ name: '', type: 'product', description: '' });
  const [visibility, setVisibility] = useState('private');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Extract-all (one plate → 4 layers)
  const [exFile, setExFile] = useState(null);
  const [exTypes, setExTypes] = useState(() => new Set(TYPES));
  const [exPrefix, setExPrefix] = useState('');
  const [exVis, setExVis] = useState('private');
  const [exBusy, setExBusy] = useState(false);
  const [exResult, setExResult] = useState(null);

  const load = () =>
    api.identities.list(filter ? `?type=${filter}` : '').then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, [filter]);
  useEffect(() => {
    if (!list.some((i) => i.status === 'analyzing')) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [list]);

  const fillDummy = () => {
    setForm({ ...DUMMY_FORM });
    setErr('');
  };

  const toggleExType = (t) => {
    setExTypes((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!file) return setErr('Select a reference image (dummy form fills text only).');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('image', file);
      fd.append('visibility', visibility);
      await api.identities.create(fd);
      setForm({ name: '', type: form.type, description: '' });
      setFile(null);
      e.target.reset();
      load();
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  };

  const submitExtract = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setExResult(null);
    if (!exFile) return setErr('Select a composite image to extract from.');
    if (!exTypes.size) return setErr('Select at least one type (product / character / environment / brand).');
    setExBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', exFile);
      fd.append('types', [...exTypes].join(','));
      fd.append('visibility', exVis);
      fd.append('createIdentities', 'true');
      if (exPrefix.trim()) fd.append('namePrefix', exPrefix.trim());
      const r = await api.identities.extractAll(fd);
      setExResult(r);
      setMsg(
        `Extracted ${r.results?.length || 0} layers` +
          (r.samEnabled ? ' (Grounded SAM 2 cutouts).' : ' (full-image fallback — enable Grounded SAM 2 for real cutouts).')
      );
      setExFile(null);
      load();
    } catch (e2) {
      setErr(e2.message);
    }
    setExBusy(false);
  };

  return (
    <>
      <PageHeader title="Identity Lock" subtitle="Create product · character · brand · environment identities. Lock for consistency." showDelete={true} />
      <p className="sub">
        Upload a reference for product, character, environment, or brand → review profile → Lock.
        Reference assets go to Asset Bank (private) or Open Shelf (shared).
      </p>
      <GuideBar onDummy={fillDummy} dummyLabel="Fill dummy form" />
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <form className="card" onSubmit={submitExtract} data-tour="id-extract" style={{ marginBottom: 16 }}>
        <h2>
          Extract all 4 from one image <Tip id="id.extract" />
        </h2>
        <p className="muted small">
          Lifestyle / campaign plate se product, character, environment, brand alag-alag nikaalo.
          Types select karo → Extract. Har type ki alag image + identity draft banegi (phir Lock kar sakte ho).
          Real cutouts ke liye Grounded SAM 2 on hona chahiye; warna full frame har type ke neeche save hoga.
        </p>
        <label>Composite image</label>
        <input type="file" accept="image/*" onChange={(e) => setExFile(e.target.files?.[0] || null)} />
        <label style={{ marginTop: 10 }}>Types to extract</label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={exTypes.has(t) ? '' : 'ghost'}
              onClick={() => toggleExType(t)}
              style={{ textTransform: 'capitalize' }}
            >
              {exTypes.has(t) ? '✓ ' : ''}
              {t}
            </button>
          ))}
        </div>
        <div className="two">
          <div>
            <label>Name prefix (optional)</label>
            <input
              value={exPrefix}
              onChange={(e) => setExPrefix(e.target.value)}
              placeholder="e.g. Desert Drop 2026"
            />
          </div>
          <div>
            <label>Save to</label>
            <div className="vis-toggle">
              <button
                type="button"
                className={exVis === 'private' ? 'active' : ''}
                onClick={() => setExVis('private')}
              >
                Asset Bank
              </button>
              <button
                type="button"
                className={exVis === 'public' ? 'active' : ''}
                onClick={() => setExVis('public')}
              >
                Open Shelf
              </button>
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button type="submit" disabled={exBusy}>
            {exBusy ? 'Extracting…' : `Extract ${exTypes.size || 0} layer${exTypes.size === 1 ? '' : 's'}`}
          </button>
        </div>
        {exResult?.results?.length > 0 && (
          <div className="grid grid-4" style={{ marginTop: 16 }}>
            {exResult.results.map((r) => {
              const url =
                r.asset?.url ||
                (r.asset?.filename ? `/uploads/${r.asset.filename}` : null);
              return (
                <div className="card" key={r.type + (r.asset?._id || '')}>
                  {url ? (
                    <img className="thumb" src={url} alt={r.type} />
                  ) : (
                    <div className="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {r.type}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="badge">{r.type}</span>
                    <span className="badge">{r.method === 'grounded-sam-2' ? 'cutout' : 'full'}</span>
                  </div>
                  {r.identity && (
                    <Link to={`/identities/${r.identity._id}`} className="muted small" style={{ display: 'block', marginTop: 6 }}>
                      Open identity →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {exResult?.warnings?.length > 0 && (
          <p className="muted small" style={{ marginTop: 8 }}>
            {exResult.warnings.join(' · ')}
          </p>
        )}
      </form>

      <form className="card" onSubmit={submit} data-tour="id-create">
        <h2>
          New identity <Tip id="id.create" />
        </h2>
        <div className="two">
          <div>
            <label>Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Matte Teal Bottle"
            />
          </div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <label>Notes (optional)</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. matte teal steel bottle, logo on left"
        />
        <label>Reference image</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />

        <label>Save reference to</label>
        <div className="vis-toggle">
          <button
            type="button"
            className={visibility === 'private' ? 'active' : ''}
            onClick={() => setVisibility('private')}
          >
            Asset Bank (private)
          </button>
          <button
            type="button"
            className={visibility === 'public' ? 'active' : ''}
            onClick={() => setVisibility('public')}
          >
            Open Shelf (shared)
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 6 }}>
          {visibility === 'private'
            ? 'Only in your Asset Bank — for private campaigns.'
            : 'Shared on Open Shelf — for team reuse and templates.'}
        </p>

        <div className="row" style={{ marginTop: 14 }}>
          <button disabled={busy}>{busy ? 'Uploading…' : 'Create & analyse'}</button>
        </div>
      </form>

      <CreateGroup visibility="private" defaultType={form.type} onCreated={() => {}} />

      <div className="row" style={{ marginBottom: 12 }}>
        <span className="muted">Filter:</span>
        <select style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">all</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-4" data-tour="id-list">
        {list.map((i) => (
          <Link to={`/identities/${i._id}`} className="card" key={i._id}>
            {i.referenceAssetIds?.[0] && (
              <img className="thumb" src={i.referenceAssetIds[0].url} alt={i.name} />
            )}
            <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
              <b>{i.name}</b>
              <span className={'badge ' + i.status}>{i.status}</span>
            </div>
            <div className="muted small">
              {i.type} · v{i.version}
            </div>
            <LockMeter compact stats={i.lockStats} locked={i.status === 'locked'} />
          </Link>
        ))}
        {!list.length && (
          <EmptyHint
            title="No identities yet"
            body="Fill name + type, select a reference image, choose Asset Bank or Open Shelf, then Create & analyse."
            why="“Identity lock = the same face or product across every campaign.”"
          />
        )}
      </div>
    </>
  );
}

export default function Identities() {
  return (
    <TourProvider steps={TOUR_STEPS}>
      <IdentitiesInner />
    </TourProvider>
  );
}
