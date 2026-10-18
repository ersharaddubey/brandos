import { useState } from 'react';
import api, { errMsg, fmtDate, inr } from '../api';
import AuthShell from '../components/AuthShell';
import { BADGE } from '../lib/booking';


export default function ManageBooking() {
  const [form, setForm] = useState({ reference: '', email: '' });
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setBooking(null);
    try { setBooking((await api.get('/bookings/lookup', { params: form })).data); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Find my booking" text="Enter the booking reference from your confirmation and the email you booked with.">
      <form onSubmit={submit} className="space-y-5">
        <label className="block"><span className="lbl">Booking reference</span><input className="inp font-mono uppercase" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. BKA1B2C3123" required /></label>
        <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button className="bt-gold w-full" disabled={busy}>{busy ? 'Searching…' : 'Find booking'}</button>
      </form>
      {booking && (
        <div className="mt-8 animate-pop glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3"><h3 className="text-2xl">{booking.hotel?.name}</h3><span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest ${BADGE[booking.status] || ''}`}>{booking.status}</span></div>
          <dl className="mt-4 divide-y divide-ink/10 text-sm">
            {[['Reference', booking.reference], ['Room', booking.room?.name], ['Guest', booking.guest.name], ['Check-in', fmtDate(booking.checkIn)], ['Check-out', `${fmtDate(booking.checkOut)} (${booking.nights} ${booking.nights === 1 ? 'night' : 'nights'})`], ['Guests', `${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}`], ['Room charges', inr(booking.subtotal)], booking.discount > 0 && [`Coupon ${booking.couponCode}`, `− ${inr(booking.discount)}`], ...(booking.food || []).map((l) => [`${l.name} × ${l.qty}`, inr(l.total)]), ['Taxes', inr(booking.taxes)], ['Total, payable at property', inr(booking.totalAmount)]].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink/70">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </AuthShell>
  );
}
