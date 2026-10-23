import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import api, { errMsg, inr } from '../api';
import { useSettings } from '../SettingsContext';

const CSS = `
.bill{font-family:Georgia,serif;color:#1a1611;background:#fff;max-width:420px;margin:0 auto;padding:28px;line-height:1.5}
.bill h1{font-size:22px;margin:0;color:#845926;text-align:center;letter-spacing:.08em}
.bill p{margin:2px 0;font-size:13px}.bill .c{text-align:center}
.bill table{width:100%;border-collapse:collapse;margin-top:12px;font-family:Arial,sans-serif;font-size:12.5px}
.bill th{text-align:left;border-bottom:1px solid #1a1611;padding:6px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.bill td{padding:6px 0;border-bottom:1px dashed #cfc5b2}.bill .r{text-align:right}
.bill .grand td{border-top:2px solid #1a1611;border-bottom:0;font-weight:bold;font-size:15px;padding-top:10px}
@media print{.noprint{display:none!important}body{background:#fff!important}}
`;

// Printable cafe bill. Customer opens it with order number + phone (from the order page); admin opens it while logged in.
export default function CafeBill() {
  const { orderNo } = useParams();
  const [sp] = useSearchParams();
  const { settings: s } = useSettings();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/cafe/bill/${orderNo}`, { params: { phone: sp.get('phone') || '' } }).then((r) => setO(r.data)).catch((e) => setError(errMsg(e)));
  }, [orderNo, sp]);

  if (error) return <div style={{ padding: 60, textAlign: 'center' }}><p style={{ color: '#b91c1c' }}>{error}</p><Link to="/cafe">Back to cafe</Link></div>;
  if (!o) return <div style={{ padding: 40, textAlign: 'center' }}>Preparing bill…</div>;

  return (
    <div style={{ background: '#ece8df', minHeight: '100vh', padding: '24px 12px' }}>
      <style>{CSS}</style>
      <div className="noprint" style={{ maxWidth: 420, margin: '0 auto 14px', display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/cafe" className="bt-line bt-sm"><ArrowLeft size={14} />Cafe</Link>
        <button className="bt-gold bt-sm" onClick={() => window.print()}><Printer size={14} />Print / Save as PDF</button>
      </div>
      <div className="bill">
        <h1>{(s.siteName || 'Hi Strangers Stay').toUpperCase()}</h1>
        <p className="c">Hi Strangers Cafe</p>
        {s.address && <p className="c">{s.address}</p>}
        {s.phone && <p className="c">{s.phone}</p>}
        <hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #c48e3a' }} />
        <p><b>Bill no:</b> {o.orderNo}</p>
        <p><b>Date:</b> {new Date(o.createdAt).toLocaleString('en-IN')}</p>
        <p><b>Customer:</b> {o.customer.name} · {o.customer.phone}</p>
        <p><b>Type:</b> {o.orderType}{o.place ? ` · ${o.place}` : ''}</p>
        <p><b>Status:</b> {o.status}{o.paymentMode ? ` · paid by ${o.paymentMode}` : ''}</p>
        <table>
          <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {o.items.map((l) => <tr key={l.name}><td>{l.name}</td><td className="r">{l.qty}</td><td className="r">{inr(l.price)}</td><td className="r">{inr(l.total)}</td></tr>)}
            <tr className="grand"><td colSpan="3">Total (GST included)</td><td className="r">{inr(o.total)}</td></tr>
          </tbody>
        </table>
        <p className="c" style={{ marginTop: 18, fontSize: 12 }}>Thank you. Come as a stranger, leave with memories.</p>
      </div>
    </div>
  );
}
