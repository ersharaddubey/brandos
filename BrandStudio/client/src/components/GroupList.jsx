import { useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * Lists groups with delete (non-system).
 * On delete: confirm whether assets should go public (Open Shelf) or Recycle Bin.
 */
export default function GroupList({ visibility = 'private', title = 'Groups' }) {
  const [groups, setGroups] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(null); // group awaiting confirm

  const load = () =>
    api.groups
      .list(visibility ? `?visibility=${visibility}` : '')
      .then(setGroups)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, [visibility]);

  const confirmDelete = async (makePublic) => {
    if (!pending) return;
    setErr('');
    setMsg('');
    try {
      const r = await api.groups.remove(pending._id, { makePublic });
      setMsg(r.message || 'Group removed.');
      setPending(null);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (!groups.length && !err) {
    return (
      <div className="card">
        <h2>{title}</h2>
        <p className="muted small">No groups yet. Default brandstudio groups appear after the server starts.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{title}</h2>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        {groups.map((g) => (
          <div
            key={g._id}
            className="row"
            style={{
              gap: 8,
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--glass-border-soft)',
              background: 'var(--glass)',
            }}
          >
            <span className="badge public">{g.name}</span>
            {g.isSystem && <span className="badge">default</span>}
            <span className="muted small">{g.assetIds?.length || 0} assets</span>
            {!g.isSystem && (
              <button type="button" className="danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPending(g)}>
                Delete group
              </button>
            )}
          </div>
        ))}
      </div>

      {pending && (
        <div className="tour-backdrop" style={{ zIndex: 9200 }} onClick={() => setPending(null)}>
          <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete “{pending.name}”?</h3>
            <p>
              What should happen to the assets in this group?
            </p>
            <p className="muted small">
              <b>Recycle Bin</b> → group + assets go to Recycle Bin for 24 hours (you can restore). After 24h they auto-delete.
              <br />
              <b>Make public</b> → assets move to Open Shelf, group is removed.
            </p>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={() => confirmDelete(false)}>
                Move to Recycle Bin
              </button>
              <button type="button" onClick={() => confirmDelete(true)}>
                Make assets public
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
