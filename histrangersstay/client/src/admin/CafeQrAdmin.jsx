import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Printable QR codes for the cafe tables. A guest scans one, lands on /cafe with the table already filled in,
// continues as guest (name + phone, no password) and orders from the phone.
const MAX_TABLES = 60;

export default function CafeQrAdmin() {
  const [base, setBase] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [count, setCount] = useState(10);
  const [extra, setExtra] = useState('');           // optional custom spots, comma separated, e.g. Garden, Terrace
  const [codes, setCodes] = useState([]);           // [{ label, url, img }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const labels = () => {
    const n = Math.max(0, Math.min(MAX_TABLES, Number(count) || 0));
    const nums = Array.from({ length: n }, (_, i) => ({ key: String(i + 1), label: `Table ${i + 1}` }));
    const custom = extra.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20).map((x) => ({ key: x, label: x }));
    return [...nums, ...custom];
  };

  const make = async () => {
    setBusy(true); setError('');
    try {
      const root = base.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(root)) throw new Error('Website address must start with https://');
      const list = [{ key: '', label: 'Cafe (no table)' }, ...labels()];
      const out = await Promise.all(list.map(async (t) => {
        const url = `${root}/cafe?${t.key ? `table=${encodeURIComponent(t.key)}&` : ''}qr=1`;
        const img = await QRCode.toDataURL(url, { width: 360, margin: 1, errorCorrectionLevel: 'M' });
        return { label: t.label, url, img };
      }));
      setCodes(out);
    } catch (e) { setError(e.message || 'Could not create the QR codes'); } finally { setBusy(false); }
  };

  useEffect(() => { make(); /* first load */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .qr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}
        .qr-card{border:1px solid var(--line);background:#fff;padding:1rem;text-align:center;break-inside:avoid}
        .qr-card img{width:100%;max-width:200px;height:auto;margin:0 auto;display:block}
        .qr-card h3{margin:.5rem 0 .1rem;font-size:1.3rem}
        .qr-card small{display:block;color:#777;word-break:break-all}
        @media print{.admin__side,.admin__top,.qr-noprint{display:none!important}.admin__main{margin:0!important}.admin__content{padding:0!important}.qr-grid{grid-template-columns:repeat(3,1fr)}}
      `}</style>
      <div className="section__head qr-noprint"><h1>Cafe QR codes</h1><button className="btn btn--dark btn--sm" onClick={() => window.print()} disabled={!codes.length}>Print all</button></div>
      <section className="card qr-noprint" style={{ marginBottom: '1.2rem' }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Print these and put one on every table. When a guest scans a code, the cafe page opens with the table filled in and the guest can order after entering name and phone. The first code (no table) is for the counter or the menu card.
        </p>
        <div style={{ display: 'grid', gap: '.9rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <label><span>Website address</span><input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://yourwebsite.com" /></label>
          <label><span>Number of tables (max {MAX_TABLES})</span><input type="number" min="0" max={MAX_TABLES} value={count} onChange={(e) => setCount(e.target.value)} /></label>
          <label><span>Other spots (optional)</span><input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Garden, Terrace, Bonfire" /></label>
        </div>
        {error && <div className="notice notice--err" style={{ marginTop: '1rem' }}>{error}</div>}
        <div style={{ marginTop: '1rem' }}><button className="btn btn--dark btn--sm" onClick={make} disabled={busy}>{busy ? 'Creating…' : 'Create QR codes'}</button></div>
      </section>

      <div className="qr-grid">
        {codes.map((c) => (
          <div key={c.url} className="qr-card">
            <strong>Hi Strangers Cafe</strong>
            <img src={c.img} alt={`QR code for ${c.label}`} />
            <h3>{c.label}</h3>
            <p style={{ margin: '.2rem 0' }}>Scan to see the menu and order</p>
            <small className="qr-noprint">{c.url}</small>
            <a className="link qr-noprint" href={c.img} download={`cafe-qr-${c.label.replace(/\W+/g, '-').toLowerCase()}.png`}>Download PNG</a>
          </div>
        ))}
      </div>
    </>
  );
}
