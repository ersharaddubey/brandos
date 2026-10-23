import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import LockMeter, { Bar, computeLive } from '../components/LockMeter.jsx';
import PromptView from '../components/PromptView.jsx';
import CreateGroup from '../components/CreateGroup.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function IdentityDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState(null);
  const [schema, setSchema] = useState(null);
  const [profile, setProfile] = useState({});
  const [rules, setRules] = useState('');
  const [anchors, setAnchors] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pv, setPv] = useState({ scene: '', aspectRatio: '', result: null, busy: false });

  const apply = (d) => {
    setDoc(d);
    setProfile(d.profile || {});
    setRules((d.rules || []).join('\n'));
    setAnchors((d.anchors || []).join('\n'));
  };
  const load = () => api.identities.get(id).then(apply).catch((e) => setErr(e.message));
  useEffect(() => { load(); api.identities.schema().then(setSchema).catch((e) => setErr(e.message)); }, [id]);
  useEffect(() => {
    if (doc?.status !== 'analyzing') return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [doc?.status]);

  const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  // live % - jaise jaise fields bharte ho, update hota rehta hai
  const live = useMemo(
    () => (doc && schema ? computeLive(schema, doc.type, profile, lines(anchors), lines(rules)) : null),
    [doc?.type, schema, profile, anchors, rules]
  );

  // Saved profile se prompt (JSON + natural paragraph). Save / lock ke baad apne aap refresh hota hai.
  const buildPrompt = async () => {
    setPv((x) => ({ ...x, busy: true }));
    try {
      const result = await api.compile({ identityIds: [id], scene: pv.scene, aspectRatio: pv.aspectRatio });
      setPv((x) => ({ ...x, result, busy: false }));
    } catch (e) { setErr(e.message); setPv((x) => ({ ...x, busy: false })); }
  };
  useEffect(() => { if (doc && doc.status !== 'analyzing') buildPrompt(); }, [doc?.updatedAt, doc?.status]);

  if (!doc) return err ? <div className="err">{err}</div> : <p className="muted">Loading...</p>;
  const locked = doc.status === 'locked';
  const known = new Set((live?.groups || []).flatMap((g) => (g.fields || []).map((f) => f.key)));
  const others = Object.keys(profile).filter((k) => !known.has(k)); // summary + purane keys

  const payload = () => ({ profile, rules: rules.split('\n'), anchors: anchors.split('\n') });
  const run = async (fn, ok) => {
    setErr(''); setMsg('');
    try { apply(await fn()); if (ok) setMsg(ok); } catch (e) { setErr(e.message); }
  };
  const save = () => run(() => api.identities.update(id, payload()), 'Saved');
  const lock = async () => {
    if (live && live.percent < 60 && !confirm(`Only ${live.percent}% of details are filled. Lock anyway?`)) return;
    setErr(''); setMsg('');
    try {
      await api.identities.update(id, payload());
      const d = await api.identities.lock(id);
      apply(d);
      setMsg(`Identity locked — ${d.lockStats?.percent ?? live?.percent}% locked`);
    } catch (e) { setErr(e.message); }
  };
  const remove = async () => {
    if (!confirm('Delete this identity and its reference images?')) return;
    await api.identities.remove(id);
    nav('/identities');
  };
  const addRef = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData(); fd.append('image', f);
    run(() => api.identities.addReference(id, fd), 'Reference added');
  };

  /** Move all reference assets of this identity to Asset Bank (private) or Public Bank */
  const sendToBank = async (visibility) => {
    setErr(''); setMsg('');
    const refs = (doc.referenceAssetIds || []).filter((a) => a && a._id);
    if (!refs.length) {
      setErr('No reference images found');
      return;
    }
    try {
      for (const a of refs) {
        await api.assets.setVisibility(a._id, visibility);
      }
      setMsg(visibility === 'public'
        ? `Reference(s) moved to Open Shelf (${refs.length})`
        : `Reference(s) moved to Asset Bank (${refs.length})`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const weak = (live?.groups || []).filter((g) => g.percent < 100);

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h1>{doc.name}</h1><p className="sub">{doc.type} · version {doc.version} · <span className={'badge ' + doc.status}>{doc.status}</span></p></div>
        <button className="danger" onClick={remove}>Delete</button>
      </div>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      {doc.analysisError && <div className="err">Analysis failed: {doc.analysisError}. Fill the profile manually or Re-analyse.</div>}
      {doc.status === 'analyzing' && <div className="ok">Analysing reference (vision)…</div>}

      <LockMeter stats={live} locked={locked} />
      {!locked && weak.length > 0 && (
        <div className="card">
          <div className="muted small">These sections lower the score (fill them or Re-analyse):</div>
          {weak.map((g) => <span key={g.key} className="chip miss">{g.label} {g.percent}%</span>)}
        </div>
      )}

      <div className="two">
        <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 16 }}>
          <h2>Reference images</h2>
          <div style={{ marginBottom: 10 }}>
            <CreateGroup
              visibility="private"
              defaultType={doc.type}
              identityIds={[doc._id]}
              assetIds={(doc.referenceAssetIds || []).map((a) => a._id).filter(Boolean)}
              onCreated={() => {}}
              compact
            />
          </div>
          <div className="grid">{doc.referenceAssetIds.map((a) => <img key={a._id} className="thumb" src={a.url} alt="" />)}</div>
          {!locked && <><label>Add another reference</label><input type="file" accept="image/*" onChange={addRef} /></>}
        </div>
        <div className="card">
          <h2>Locked profile</h2>
          {live?.groups.map((g) => (
            <div className="sec" key={g.key}>
              <h3>
                <span>{g.label} <span className="badge">{g.scope === 'identity' ? 'enforced' : 'reference only'}</span></span>
                <span className="small muted">{g.kind === 'count' ? `${g.count} added (target ${g.total})` : `${g.filled}/${g.total}`} · <b>{g.percent}%</b></span>
              </h3>
              <Bar percent={g.percent} small />
              {g.key === 'anchors' && (
                <>
                  <label>Unique visual locks (ek line = ek anchor, 5-8 best)</label>
                  <textarea className="fieldta" style={{ minHeight: 90 }} disabled={locked} value={anchors} onChange={(e) => setAnchors(e.target.value)} />
                </>
              )}
              {g.key === 'rules' && (
                <>
                  <label>Rules (ek line = ek rule)</label>
                  <textarea className="fieldta" style={{ minHeight: 90 }} disabled={locked} value={rules} onChange={(e) => setRules(e.target.value)} />
                </>
              )}
              {g.kind === 'fields' && g.fields.map((f) => (
                <div key={f.key}>
                  <label title={f.hint}>{f.label}</label>
                  <textarea className="fieldta" disabled={locked} value={profile[f.key] || ''} onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
          ))}
          {others.length > 0 && (
            <div className="sec">
              <h3><span>Other details</span><span className="small muted">% me count nahi</span></h3>
              {others.map((k) => (
                <div key={k}>
                  <label>{k}</label>
                  <textarea className="fieldta" disabled={locked} value={profile[k] || ''} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            {!locked ? (
              <>
                <button className="ghost" onClick={save}>Save</button>
                <button onClick={lock} disabled={doc.status === 'analyzing'}>Lock identity{live ? ` (${live.percent}%)` : ''}</button>
                <button className="ghost" onClick={() => run(() => api.identities.reanalyze(id))}>Re-analyse</button>
                <button type="button" className="ghost" onClick={() => sendToBank('private')}>Move to Asset Bank</button>
                <button type="button" onClick={() => sendToBank('public')}>Move to Open Shelf</button>
              </>
            ) : (
              <>
                <button className="ghost" onClick={() => run(() => api.identities.unlock(id))}>Unlock to edit</button>
                <button type="button" className="ghost" onClick={() => sendToBank('private')}>Move to Asset Bank</button>
                <button type="button" onClick={() => sendToBank('public')}>Move to Open Shelf</button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Prompt for any image site</h2>
        <p className="muted small" style={{ marginTop: 0 }}>No photo is sent — copy this prompt into any generator. Empty scene keeps the reference scene. (Save first so the latest profile is used.)</p>
        <div className="two">
          <div><label>New scene (optional)</label><input value={pv.scene} onChange={(e) => setPv({ ...pv, scene: e.target.value })} placeholder="e.g. same person standing on a sunlit rooftop" /></div>
          <div><label>Aspect ratio</label>
            <select value={pv.aspectRatio} onChange={(e) => setPv({ ...pv, aspectRatio: e.target.value })}>
              <option value="">from reference</option>{['1:1', '4:5', '3:4', '9:16', '16:9'].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}><button disabled={pv.busy} onClick={buildPrompt}>{pv.busy ? 'Building...' : 'Build prompt'}</button></div>
      </div>
      <PromptView result={pv.result} title="Compiled prompt" />

      {doc.history?.length > 0 && (
        <div className="card">
          <h2>Version history</h2>
          {doc.history.map((h) => (
            <details key={h.version}>
              <summary>v{h.version}{h.lockPercent != null ? ` · ${h.lockPercent}% locked` : ''} · {new Date(h.at).toLocaleString()}</summary>
              <pre>{JSON.stringify({ profile: h.profile, anchors: h.anchors, rules: h.rules }, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
