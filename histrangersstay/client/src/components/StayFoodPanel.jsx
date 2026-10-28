import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Lock } from 'lucide-react';
import api, { errMsg, fmtDate, inr } from '../api';
import { useAuth } from '../AuthContext';
import { canEditFood, foodQtyMap } from '../lib/booking';

/**
 * "Add food to your stay": picks one of the guest's active bookings, shows its current food in the menu
 * (cart is filled from the booking, so nothing already ordered is lost) and saves the new list to that booking.
 * After saving, the guest lands on My account where the booking and bill are shown.
 * The menu itself is the cafe menu on the same page: this panel only owns the booking and the Save button.
 */
export default function StayFoodPanel({ menu, cart, setCart, loginFrom = '/cafe?mode=stay' }) {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [bookings, setBookings] = useState(null); // null = loading
  const [bid, setBid] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) { setBookings(null); return undefined; }
    let live = true;
    api.get('/bookings/mine')
      .then((r) => {
        if (!live) return;
        const list = (Array.isArray(r.data) ? r.data : []).filter(canEditFood).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
        setBookings(list); setBid(list[0]?._id || '');
      })
      .catch((e) => { if (live) { setBookings([]); setErr(errMsg(e)); } });
    return () => { live = false; };
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const booking = bookings?.find((b) => b._id === bid);
  // Start from what is already on the booking, so saving never drops earlier dishes
  useEffect(() => { if (booking) setCart(foodQtyMap(booking)); }, [bid, bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => menu.filter((m) => cart[m._id] > 0).map((m) => ({ ...m, qty: cart[m._id], total: m.price * cart[m._id] })), [menu, cart]);
  const total = lines.reduce((t, l) => t + l.total, 0);
  const gone = booking && menu.length ? (booking.food || []).filter((l) => !menu.find((m) => m._id === String(l.item))) : [];

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.put(`/bookings/mine/${booking._id}/food`, { items: lines.map((l) => ({ item: l._id, qty: l.qty })) });
      nav('/account');
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  };

  const box = 'surface space-y-4 p-6 lg:sticky lg:top-28';

  if (!ready || (user && bookings === null)) return <div className={box}><p className="text-sm text-ink/70">Loading your bookings…</p></div>;

  if (!user) return (
    <div className={box}>
      <h2 className="flex items-center gap-2 text-2xl"><Lock size={19} className="text-gold-700" />Log in to add food</h2>
      <p className="text-sm text-ink/75">Food for your stay is added to your booking and shown on your invoice. Log in with the account you booked with.</p>
      <div className="flex flex-wrap gap-3">
        <Link className="bt-gold bt-sm" to="/login" state={{ from: loginFrom }}>Log in</Link>
        <Link className="bt-line bt-sm" to="/register" state={{ from: loginFrom }}>Register</Link>
      </div>
    </div>
  );

  if (bookings.length === 0) return (
    <div className={box}>
      <h2 className="flex items-center gap-2 text-2xl"><BedDouble size={19} className="text-gold-700" />No active booking</h2>
      <p className="text-sm text-ink/75">{err || 'We could not find an upcoming or current booking on your account. Book a room first, then add food here.'}</p>
      <Link className="bt-gold bt-sm" to="/stay#book">Book a room</Link>
    </div>
  );

  return (
    <div className={box}>
      <h2 className="flex items-center gap-2 text-2xl"><BedDouble size={19} className="text-gold-700" />Add to my booking</h2>
      <label className="block"><span className="lbl">Booking</span>
        <select className="inp" value={bid} onChange={(e) => setBid(e.target.value)}>
          {bookings.map((b) => <option key={b._id} value={b._id}>{b.reference} · {b.room?.name} · {fmtDate(b.checkIn)} to {fmtDate(b.checkOut)}</option>)}
        </select>
      </label>
      {gone.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Some earlier dishes are no longer on the menu and will be removed when you save: {gone.map((l) => l.name).join(', ')}.</p>}
      {lines.length === 0 ? <p className="text-sm text-ink/65">No food on this booking yet. Tap “Add” on a dish.</p> : (
        <div className="space-y-1.5 text-sm">
          {lines.map((l) => <div key={l._id} className="flex justify-between gap-3"><span>{l.name} × {l.qty}</span><span>{inr(l.total)}</span></div>)}
        </div>
      )}
      <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><span>Food total (before tax)</span><span className="font-serif text-xl">{inr(total)}</span></div>
      {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      <button type="button" className="bt-gold w-full" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save to my booking'}</button>
      <p className="text-center text-xs text-ink/65">Taxes are added to your bill. You pay at the property.</p>
    </div>
  );
}
