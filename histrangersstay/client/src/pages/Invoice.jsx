import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import api, { errMsg, fmtDate, inr } from '../api';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';

// Plain CSS so the invoice looks the same on screen, when printed / saved as PDF, and as a downloaded file.
const CSS = `
.inv{font-family:Georgia,'Times New Roman',serif;color:#1a1611;background:#fff;max-width:820px;margin:0 auto;padding:48px;line-height:1.5;position:relative}
.inv *{box-sizing:border-box}
.inv h1{font-size:34px;letter-spacing:.12em;margin:0;color:#845926}
.inv h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#845926;margin:0 0 6px;font-family:Arial,sans-serif}
.inv p{margin:2px 0;font-size:14px}
.inv .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #c48e3a;padding-bottom:20px}
.inv .brand{font-size:24px;font-weight:bold}
.inv .meta{text-align:right;font-family:Arial,sans-serif;font-size:13px}
.inv .grid{display:flex;gap:24px;margin:24px 0}
.inv .grid>div{flex:1}
.inv table{width:100%;border-collapse:collapse;margin-top:8px;font-family:Arial,sans-serif;font-size:13px}
.inv th{background:#f4efe6;text-align:left;padding:10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.inv td{padding:10px;border-bottom:1px solid #e5dccb;vertical-align:top}
.inv .r{text-align:right}
.inv .tot td{border-bottom:0;padding:6px 10px}
.inv .grand td{border-top:2px solid #1a1611;font-size:16px;font-weight:bold;padding-top:12px}
.inv .note{margin-top:28px;font-family:Arial,sans-serif;font-size:12px;color:#5a5144;border-top:1px solid #e5dccb;padding-top:14px}
.inv .badge{display:inline-block;padding:3px 10px;border:1px solid #c48e3a;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-family:Arial,sans-serif}
.inv .void{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);font-size:80px;color:rgba(185,28,28,.15);font-weight:bold;letter-spacing:.1em;pointer-events:none;font-family:Arial,sans-serif}
@media print{.noprint{display:none!important}body{background:#fff!important}.inv{padding:0;max-width:none}}
`;

export default function Invoice() {
  const { id } = useParams();
  const { user, ready } = useAuth();
  const { settings: s } = useSettings();
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  const sheet = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get(user.role === 'admin' ? `/billing/booking/${id}` : `/bookings/mine/${id}`).then((r) => setB(r.data)).catch((e) => setError(errMsg(e)));
  }, [id, user]);

  if (!ready) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: `/invoice/${id}` }} replace />;
  if (error) return <div style={{ padding: 60, textAlign: 'center' }}><p style={{ color: '#b91c1c' }}>{error}</p><Link to="/account">Back to my account</Link></div>;
  if (!b) return <div style={{ padding: 40, textAlign: 'center' }}>Preparing invoice…</div>;

  const taxPercent = b.taxPercent ?? s.taxPercent ?? 0;
  const rate = b.nights ? Math.round(b.subtotal / b.nights) : 0;
  const invoiceNo = b.invoiceNo || `INV-${b.reference}`;
  const hotel = b.hotel || {};

  const download = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNo}</title><style>body{margin:0;background:#f4f4f4}${CSS}</style></head><body>${sheet.current.outerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${invoiceNo}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={{ background: '#ece8df', minHeight: '100vh', padding: '24px 12px' }}>
      <style>{CSS}</style>
      <div className="noprint" style={{ maxWidth: 820, margin: '0 auto 16px', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/account" className="bt-line bt-sm"><ArrowLeft size={14} />My account</Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="bt-gold bt-sm" onClick={() => window.print()}><Printer size={14} />Print / Save as PDF</button>
          <button className="bt-dark bt-sm" onClick={download}><Download size={14} />Download</button>
        </div>
      </div>

      <div className="inv" ref={sheet}>
        {b.status === 'cancelled' && <div className="void">CANCELLED</div>}
        <div className="top">
          <div>
            <div className="brand">{hotel.name || s.siteName}</div>
            {(hotel.address || s.address) && <p>{hotel.address || s.address}</p>}
            {s.phone && <p>Phone: {s.phone}</p>}
            {s.email && <p>Email: {s.email}</p>}
          </div>
          <div className="meta">
            <h1>INVOICE</h1>
            <p><b>{invoiceNo}</b></p>
            <p>Date: {fmtDate(b.createdAt)}</p>
            <p>Booking ref: {b.reference}</p>
            <p style={{ marginTop: 6 }}><span className="badge">{b.status}</span></p>
          </div>
        </div>

        <div className="grid">
          <div>
            <h2>Billed to</h2>
            <p><b>{b.guest.name}</b></p>
            <p>{b.guest.email}</p>
            <p>{b.guest.phone}</p>
          </div>
          <div>
            <h2>Stay details</h2>
            <p>Room: <b>{b.room?.name}</b></p>
            <p>Check-in: {fmtDate(b.checkIn)}{s.checkInTime ? ` (${s.checkInTime})` : ''}</p>
            <p>Check-out: {fmtDate(b.checkOut)}{s.checkOutTime ? ` (${s.checkOutTime})` : ''}</p>
            <p>{b.nights} {b.nights === 1 ? 'night' : 'nights'} · {b.adults} {b.adults === 1 ? 'adult' : 'adults'}{b.children ? `, ${b.children} ${b.children === 1 ? 'child' : 'children'}` : ''}</p>
          </div>
        </div>

        <table>
          <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
          <tbody>
            <tr><td>Room: {b.room?.name}<br /><span style={{ color: '#6b6254' }}>{fmtDate(b.checkIn)} to {fmtDate(b.checkOut)}</span></td><td className="r">{b.nights} {b.nights === 1 ? 'night' : 'nights'}</td><td className="r">{inr(rate)}</td><td className="r">{inr(b.subtotal)}</td></tr>
            {b.mealPlan && <tr><td>Meal plan: {b.mealPlan.name}<br /><span style={{ color: '#6b6254' }}>{(b.mealPlan.includes || []).join(', ')} · {b.mealPlan.guests} {b.mealPlan.guests === 1 ? 'guest' : 'guests'} × {b.mealPlan.days} {b.mealPlan.days === 1 ? 'day' : 'days'}</span></td><td className="r">{b.mealPlan.guests * b.mealPlan.days}</td><td className="r">{inr(b.mealPlan.pricePerPerson)}</td><td className="r">{inr(b.mealPlan.total)}</td></tr>}
            {(b.food || []).map((l) => (
              <tr key={`${l.item}-${l.name}`}><td>Food: {l.name}</td><td className="r">{l.qty}</td><td className="r">{inr(l.price)}</td><td className="r">{inr(l.total)}</td></tr>
            ))}
          </tbody>
        </table>

        <table style={{ marginTop: 0 }}>
          <tbody>
            <tr className="tot"><td className="r" style={{ width: '70%' }}>Room charges</td><td className="r">{inr(b.subtotal)}</td></tr>
            {b.discount > 0 && <tr className="tot"><td className="r">Discount (coupon {b.couponCode}{b.discountPercent ? `, ${b.discountPercent}%` : ''})</td><td className="r">− {inr(b.discount)}</td></tr>}
            {b.mealTotal > 0 && <tr className="tot"><td className="r">Meal plan</td><td className="r">{inr(b.mealTotal)}</td></tr>}
            {b.foodTotal > 0 && <tr className="tot"><td className="r">Food</td><td className="r">{inr(b.foodTotal)}</td></tr>}
            <tr className="tot"><td className="r">Taxes ({taxPercent}%)</td><td className="r">{inr(b.taxes)}</td></tr>
            <tr className="tot grand"><td className="r">Total</td><td className="r">{inr(b.totalAmount)}</td></tr>
          </tbody>
        </table>

        <div className="note">
          <p><b>Payment:</b> No online payment was taken. The total above is payable at the property.</p>
          {b.specialRequests && <p><b>Guest request:</b> {b.specialRequests}</p>}
          <p style={{ marginTop: 8 }}>Thank you for choosing {hotel.name || s.siteName}.</p>
        </div>
      </div>
    </div>
  );
}
