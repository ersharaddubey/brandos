import { useState } from 'react';
import { api } from '../api.js';

/**
 * Top-of-page header with optional delete action for images/assets.
 * Use on every page: pass title, subtitle, and optional onDelete / deleteLabel.
 */
export default function PageHeader({ title, subtitle, onDelete, deleteLabel = 'Delete selected image', showDelete = true }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleDelete = async () => {
    if (!onDelete) {
      // Fallback: open recycle or ask for asset id via prompt (simple UX)
      const id = window.prompt('Asset / Image ID to delete (from Asset Bank or generation):');
      if (!id) return;
      setBusy(true);
      try {
        await api.assets.remove(id.trim());
        setMsg('Deleted. Check Recycle Bin if needed.');
        setTimeout(() => setMsg(''), 3000);
      } catch (e) {
        setMsg(e.message || 'Delete failed');
      }
      setBusy(false);
      return;
    }
    if (!window.confirm(`Confirm: ${deleteLabel}?`)) return;
    setBusy(true);
    try {
      await onDelete();
      setMsg('Deleted successfully');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg(e.message || 'Failed');
    }
    setBusy(false);
  };

  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      <div className="page-header-right">
        {msg && <span className="ok small" style={{ marginRight: 10 }}>{msg}</span>}
        {showDelete && (
          <button
            type="button"
            className="ghost danger-outline"
            disabled={busy}
            onClick={handleDelete}
            title="Delete image / asset"
          >
            {busy ? 'Deleting…' : '🗑 Delete image'}
          </button>
        )}
      </div>
    </div>
  );
}
