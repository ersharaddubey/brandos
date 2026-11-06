import { useState } from 'react';
import { api } from '../api.js';

const TYPES = ['product', 'character', 'environment', 'brand'];

/**
 * Create a group named "{companyName} {type}".
 * Optional: pass assetIds / identityIds / visibility / onCreated
 */
export default function CreateGroup({
  visibility = 'private',
  assetIds = [],
  identityIds = [],
  defaultType = 'product',
  onCreated,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState(defaultType);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const preview = companyName.trim() ? `${companyName.trim()} ${type}` : `Company ${type}`;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!companyName.trim()) {
      setErr('Company name is required');
      return;
    }
    setBusy(true);
    try {
      const g = await api.groups.create({
        companyName: companyName.trim(),
        type,
        assetIds,
        identityIds,
        visibility,
      });
      setCompanyName('');
      setOpen(false);
      onCreated?.(g);
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <button type="button" className={compact ? 'ghost' : ''} onClick={() => setOpen(true)}>
        Create group
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Create group</h3>
      <p className="muted small">Group name = company name + type (e.g. Acme product)</p>
      <label>Company name</label>
      <input
        required
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Acme Corp"
      />
      <label>Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <p className="muted small" style={{ marginTop: 8 }}>
        Preview: <b style={{ color: 'var(--text)' }}>{preview}</b>
      </p>
      {err && <div className="err">{err}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
