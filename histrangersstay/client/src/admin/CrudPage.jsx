import { useEffect, useState } from 'react';
import api, { errMsg, toInputDate } from '../api';
import { ImageField, ImagesField } from './ImageField';

const Wrap = ({ as: Tag, ...rest }) => <Tag {...rest} />;

/*
  Generic admin page: list + add/edit drawer + delete.
  fields: { name, label, type: text|textarea|number|select|checkbox|date|list|images|ref, options, refEndpoint, refLabel, required, hint }
  columns: { label, render(row) }
*/
export default function CrudPage({ title, singular, endpoint, fields, columns, defaults = {}, fixed = {}, single = false, canDelete = true, note = null, onChange = null, sub = false }) {
  const [rows, setRows] = useState([]);
  const [refs, setRefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [formErr, setFormErr] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`${endpoint}/admin/all`)
      .then((r) => { setRows(r.data); if (onChange) onChange(r.data); })
      .catch((e) => setMsg({ err: true, text: errMsg(e) }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fields.filter((f) => f.type === 'ref').forEach((f) => {
      api.get(`${f.refEndpoint}/admin/all`).then((r) => setRefs((p) => ({ ...p, [f.name]: r.data }))).catch(() => {});
    });
  }, [endpoint]);

  const toForm = (row) => {
    const out = { ...defaults };
    fields.forEach((f) => {
      let v = row ? row[f.name] : defaults[f.name];
      if (f.type === 'ref') v = v && typeof v === 'object' ? v._id : v || '';
      if (f.type === 'list') v = (v || []).join(', ');
      if (f.type === 'images') v = Array.isArray(v) ? v : [];
      if (f.type === 'date') v = toInputDate(v);
      if (f.type === 'checkbox') v = v ?? true;
      out[f.name] = v ?? '';
    });
    return out;
  };

  const open = (row) => { setEditing(row || 'new'); setForm(toForm(row)); setFormErr(''); };
  const close = () => setEditing(null);

  const toPayload = () => {
    const p = {};
    fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === 'number') v = v === '' ? undefined : Number(v);
      if (f.type === 'list') v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      if (f.type === 'images') v = Array.isArray(v) ? v.filter(Boolean) : [];
      if (f.type === 'date') v = v || null;
      p[f.name] = v;
    });
    return { ...p, ...fixed };
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setFormErr('');
    try {
      if (editing === 'new') await api.post(endpoint, toPayload());
      else await api.put(`${endpoint}/${editing._id}`, toPayload());
      setMsg({ text: `${singular} ${editing === 'new' ? 'added' : 'updated'}` });
      close(); load();
    } catch (err) { setFormErr(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${singular.toLowerCase()}? This cannot be undone.`)) return;
    try { await api.delete(`${endpoint}/${row._id}`); setMsg({ text: `${singular} deleted` }); load(); }
    catch (err) { setMsg({ err: true, text: errMsg(err) }); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const renderField = (f) => {
    const v = form[f.name];
    switch (f.type) {
      case 'textarea': return <textarea rows="3" value={v} onChange={(e) => set(f.name, e.target.value)} required={f.required} />;
      case 'number': return <input type="number" min={f.min ?? 0} value={v} onChange={(e) => set(f.name, e.target.value)} required={f.required} />;
      case 'date': return <input type="date" value={v} onChange={(e) => set(f.name, e.target.value)} />;
      case 'checkbox': return <input type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} />;
      case 'select': return (
        <select value={v} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
      case 'ref': return (
        <select value={v} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
          <option value="">Select…</option>
          {(refs[f.name] || []).map((r) => <option key={r._id} value={r._id}>{r[f.refLabel]}{r.city ? `, ${r.city}` : ''}</option>)}
        </select>
      );
      case 'images': return <ImagesField value={v} onChange={(arr) => set(f.name, arr)} />;
      case 'image': return <ImageField value={v} onChange={(url) => set(f.name, url)} />;
      default:
        return <input value={v} onChange={(e) => set(f.name, e.target.value)} required={f.required} />;
    }
  };

  return (
    <>
      <div className="section__head" style={sub ? { marginTop: '2.4rem' } : undefined}>
        {sub ? <h2>{title}</h2> : <h1>{title}</h1>}
        {(!single || rows.length === 0) && !loading && <button className="btn btn--dark btn--sm" onClick={() => open(null)}>Add {singular.toLowerCase()}</button>}
      </div>
      {note && <p className="muted" style={{ marginTop: '-.4rem' }}>{note}</p>}
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <p className="muted">Nothing here yet. Use “Add {singular.toLowerCase()}” to create the first one.</p>
        ) : (
          <table className="table">
            <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  {columns.map((c) => <td key={c.label}>{c.render(r)}</td>)}
                  <td className="actions"><button className="link" onClick={() => open(r)}>Edit</button>{canDelete && <button className="link danger" onClick={() => remove(r)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label={`${editing === 'new' ? 'Add' : 'Edit'} ${singular}`}>
          <div className="drawer__shade" onClick={close} />
          <form className="drawer__panel" onSubmit={save}>
            <div className="section__head"><h2>{editing === 'new' ? `Add ${singular.toLowerCase()}` : `Edit ${singular.toLowerCase()}`}</h2><button type="button" className="link" onClick={close}>Close</button></div>
            <div className="drawer__fields">
              {fields.map((f) => (
                <Wrap key={f.name} as={f.type === 'images' || f.type === 'image' ? 'div' : 'label'} className={f.type === 'checkbox' ? 'check' : f.type === 'images' || f.type === 'image' ? 'fieldbox' : ''}>
                  <span>{f.label}{f.required && ' *'}</span>
                  {renderField(f)}
                  {f.hint && <small className="muted">{f.hint}</small>}
                </Wrap>
              ))}
            </div>
            {formErr && <div className="notice notice--err">{formErr}</div>}
            <div className="drawer__foot">
              <button type="button" className="btn btn--line" onClick={close}>Cancel</button>
              <button className="btn btn--dark" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
