/* One link per line: each link has its own single-line box. value = array of strings */
export default function LinkList({ value = [], onChange, placeholder, isValid, addLabel = 'Add another link' }) {
  const rows = value.length ? value : [''];
  const set = (i, v) => onChange(rows.map((x, k) => (k === i ? v : x)));
  return (
    <div className="links">
      {rows.map((v, i) => {
        const ok = v.trim() && isValid ? isValid(v) : null;
        return (
          <div className="links__row" key={i}>
            <input value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <span className={`links__state ${ok === true ? 'is-ok' : ok === false ? 'is-bad' : ''}`}>{ok === true ? '✓ Link OK' : ok === false ? 'Not a valid link' : ''}</span>
            {rows.length > 1 || v ? <button type="button" className="link danger" onClick={() => onChange(rows.length > 1 ? rows.filter((_, k) => k !== i) : [''])}>Remove</button> : null}
          </div>
        );
      })}
      <button type="button" className="btn btn--line btn--sm" onClick={() => onChange([...rows, ''])}>+ {addLabel}</button>
    </div>
  );
}
