import { ImageField } from './ImageField';

/*
  Structured editor for the "A | B | C" line fields. Stored exactly like before (one string per line),
  so the website keeps working. Fields: { key, label, type: 'text' | 'image', placeholder }
*/
const clean = (v) => String(v || '').replace(/\|/g, '/').replace(/\n/g, ' ');

export const linesToRows = (lines, fields) => (Array.isArray(lines) ? lines : String(lines || '').split('\n'))
  .filter((l) => String(l).trim())
  .map((l) => {
    const p = String(l).split('|').map((x) => x.trim());
    const row = {};
    fields.forEach((f, i) => { row[f.key] = i === fields.length - 1 ? p.slice(i).join(' | ') : (p[i] || ''); });
    return row;
  });

export const rowsToLines = (rows, fields) => rows
  .map((r) => fields.map((f) => clean(r[f.key])).join(' | ').replace(/(\s*\|\s*)+$/, '').trim())
  .filter((l) => l.replace(/\|/g, '').trim());

export default function RowsEditor({ rows, onChange, fields, addLabel = 'Add another', noun = 'Item' }) {
  const set = (i, key, v) => onChange(rows.map((r, k) => (k === i ? { ...r, [key]: v } : r)));
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, '']));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; n.splice(j, 0, n.splice(i, 1)[0]); onChange(n); };

  return (
    <div className="rows">
      {rows.length === 0 && <p className="muted small">Nothing added yet.</p>}
      {rows.map((r, i) => (
        <div className="rows__item" key={i}>
          <div className="rows__head">
            <b>{noun} {i + 1}</b>
            <span>
              <button type="button" className="link" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="link" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="link danger" onClick={() => onChange(rows.filter((_, k) => k !== i))}>Delete</button>
            </span>
          </div>
          <div className="rows__body">
            {fields.map((f) => (f.type === 'image' ? (
              <div key={f.key} className="rows__img"><ImageField value={r[f.key]} onChange={(v) => set(i, f.key, v)} /></div>
            ) : (
              <label key={f.key}>
                <span>{f.label}</span>
                {f.type === 'area'
                  ? <textarea rows="2" value={r[f.key]} placeholder={f.placeholder} onChange={(e) => set(i, f.key, e.target.value)} />
                  : <input value={r[f.key]} placeholder={f.placeholder} onChange={(e) => set(i, f.key, e.target.value)} />}
              </label>
            )))}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--line btn--sm" onClick={() => onChange([...rows, blank()])}>+ {addLabel}</button>
    </div>
  );
}
