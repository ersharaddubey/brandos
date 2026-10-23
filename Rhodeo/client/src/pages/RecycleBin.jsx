import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function RecycleBin() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => api.recycle.list().then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const hoursLeft = (expiresAt) => {
    const ms = new Date(expiresAt) - Date.now();
    if (ms <= 0) return 'expiring…';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m left`;
  };

  const permanent = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    setBusyId(id);
    setErr('');
    try {
      await api.recycle.remove(id);
      setMsg('Permanently deleted.');
      load();
    } catch (e) {
      setErr(e.message);
    }
    setBusyId(null);
  };

  const restore = async (id) => {
    if (!confirm('Restore this item? It will come back to its original place (Asset Bank / Groups / Identities).')) return;
    setBusyId(id);
    setErr('');
    setMsg('');
    try {
      const r = await api.recycle.restore(id);
      setMsg(r?.kind ? `Restored ${r.kind} successfully.` : 'Restored successfully.');
      load();
    } catch (e) {
      setErr(e.message);
    }
    setBusyId(null);
  };

  const empty = async () => {
    if (!confirm('Empty the entire Recycle Bin permanently? All items will be deleted forever.')) return;
    setErr('');
    try {
      const r = await api.recycle.empty();
      setMsg(`Emptied (${r.removed || 0} items).`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const displayName = (item) => {
    const snap = item.snapshot || {};
    if (item.kind === 'group') return snap.name || 'Group';
    if (item.kind === 'identity') return snap.name || 'Identity';
    if (item.kind === 'asset') return snap.filename || snap.category || 'Asset';
    return item.kind;
  };

  return (
    <>
      <h1>Recycle Bin</h1>
      <p className="sub">
        Deleted items stay here for 24 hours. Use <b>Restore</b> to bring them back, or <b>Delete permanently</b> /
        <b> Empty bin</b> to remove forever. Items not restored auto-delete after the timer.
      </p>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="row" style={{ marginBottom: 14 }}>
        <button type="button" className="ghost" onClick={load}>
          Refresh
        </button>
        {list.length > 0 && (
          <button type="button" className="danger" onClick={empty}>
            Empty bin
          </button>
        )}
      </div>

      <div className="grid grid-4">
        {list.map((item) => {
          const snap = item.snapshot || {};
          const url = snap.url || (snap.filename ? `/uploads/${snap.filename}` : null);
          return (
            <div className="card" key={item._id}>
              {url ? (
                <img className="thumb" src={url} alt="" />
              ) : (
                <div
                  className="thumb"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  {item.kind}
                </div>
              )}
              <div className="row" style={{ marginTop: 8 }}>
                <span className="badge">{item.kind}</span>
                <span className="badge warn">{hoursLeft(item.expiresAt)}</span>
              </div>
              <div style={{ marginTop: 6, fontWeight: 600, fontSize: 14 }}>{displayName(item)}</div>
              <div className="muted small" style={{ marginTop: 4 }}>
                {item.reason || 'deleted'} · {new Date(item.createdAt).toLocaleString()}
              </div>
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={busyId === item._id}
                  onClick={() => restore(item._id)}
                >
                  {busyId === item._id ? '…' : 'Restore'}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busyId === item._id}
                  onClick={() => permanent(item._id)}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          );
        })}
        {!list.length && <p className="muted">Recycle Bin is empty.</p>}
      </div>
    </>
  );
}
