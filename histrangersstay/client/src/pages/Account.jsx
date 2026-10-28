import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CalendarDays, Users, FileText, Utensils, X, Pencil, BedDouble, Moon, Wallet, ArrowRight, Tag } from 'lucide-react';
import api, { errMsg, fmtDate, inr } from '../api';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import FoodMenu, { VegDot } from '../components/FoodMenu';
import { BADGE, bucket, canCancel, canEditFood, foodQtyMap } from '../lib/booking';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const TABS = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled'], ['all', 'All']];

function ProfileCard({ user, stats }) {
  const { updateProfile } = useAuth();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await updateProfile(form); setEdit(false); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="glass-strong rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-start gap-5">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-700 font-serif text-3xl font-semibold text-white shadow-gold">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          {edit ? (
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <label><span className="lbl">Full name</span><input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label><span className="lbl">Phone</span><input className="inp" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <div className="flex gap-2 sm:col-span-2">
                <button className="bt-gold bt-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                <button type="button" className="bt-line bt-sm" onClick={() => { setEdit(false); setForm({ name: user.name, phone: user.phone || '' }); }}>Cancel</button>
              </div>
              {err && <p className="text-sm text-red-700 sm:col-span-2">{err}</p>}
            </form>
          ) : (
            <>
              <p className="eyebrow">My profile</p>
              <h1 className="mt-1 text-4xl md:text-5xl">{user.name}</h1>
              <p className="mt-2 text-ink/80">{user.email}</p>
              <p className="text-ink/80">{user.phone || 'No phone added'}</p>
              <button onClick={() => setEdit(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:underline"><Pencil size={14} />Edit profile</button>
            </>
          )}
        </div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[CalendarDays, 'Bookings', stats.total], [ArrowRight, 'Upcoming', stats.upcoming], [Moon, 'Nights stayed', stats.nights], [Wallet, 'Total value', inr(stats.spent)]].map(([Icon, label, v]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <Icon size={18} className="text-gold-700" />
            <p className="mt-2 font-serif text-3xl font-semibold leading-none">{v}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-ink/68">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FoodEditor({ booking, onClose, onSaved }) {
  const [menu, setMenu] = useState([]);
  const [qty, setQty] = useState(foodQtyMap(booking));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/food').then((r) => setMenu(r.data)).catch((e) => setErr(errMsg(e))); }, []);

  const set = (id, n) => setQty((q) => { const next = { ...q }; if (n <= 0) delete next[id]; else next[id] = n; return next; });
  // Items ordered earlier that are no longer on the menu cannot be kept, so we warn before saving
  const kept = (booking.food || []).filter((l) => !menu.find((m) => m._id === String(l.item)));
  const total = menu.reduce((t, f) => t + (qty[f._id] || 0) * f.price, 0);

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const items = [...menu.filter((f) => qty[f._id] > 0).map((f) => ({ item: f._id, qty: qty[f._id] }))];
      const { data } = await api.put(`/bookings/mine/${booking._id}/food`, { items });
      onSaved(data);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Food for this booking">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 p-5">
          <div><h3 className="text-3xl">Food for booking {booking.reference}</h3><p className="mt-1 text-sm text-ink/70">{fmtDate(booking.checkIn)} to {fmtDate(booking.checkOut)}. Change quantities and save.</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-ink/10"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5">
          {kept.length > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Some earlier items are no longer on the menu and will be removed when you save: {kept.map((l) => l.name).join(', ')}.</p>}
          <FoodMenu items={menu} qty={qty} onQty={set} canOrder stickyClass="top-0" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 p-5">
          <div><p className="text-xs uppercase tracking-widest text-ink/68">Food total (before tax)</p><p className="font-serif text-3xl font-semibold">{inr(total)}</p></div>
          <div className="flex gap-2">
            {err && <p className="self-center text-sm text-red-700">{err}</p>}
            <button className="bt-line" onClick={onClose}>Close</button>
            <button className="bt-gold" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save food order'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ b, onFood, onCancel }) {
  const { settings: s } = useSettings();
  const row = 'flex justify-between gap-4 py-1.5';
  return (
    <article className="glass rounded-3xl p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/68">Booking reference</p>
          <p className="font-mono text-xl font-semibold tracking-[0.15em]">{b.reference}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest ${BADGE[b.status] || ''}`}>{b.status}</span>
      </div>

      <h3 className="mt-4 text-3xl">{b.hotel?.name || s.siteName}</h3>
      <p className="flex items-center gap-2 text-ink/78"><BedDouble size={16} className="text-gold-700" />{b.room?.name}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-2xl bg-white/50 p-4"><p className="text-xs uppercase tracking-widest text-ink/68">Check-in</p><p className="mt-1 font-serif text-2xl font-semibold">{fmtDate(b.checkIn)}</p>{s.checkInTime && <p className="text-xs text-ink/68">{s.checkInTime}</p>}</div>
        <div className="text-center text-sm text-ink/70"><ArrowRight className="mx-auto hidden text-gold-700 sm:block" size={20} />{b.nights} {b.nights === 1 ? 'night' : 'nights'}</div>
        <div className="rounded-2xl bg-white/50 p-4"><p className="text-xs uppercase tracking-widest text-ink/68">Check-out</p><p className="mt-1 font-serif text-2xl font-semibold">{fmtDate(b.checkOut)}</p>{s.checkOutTime && <p className="text-xs text-ink/68">{s.checkOutTime}</p>}</div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink/78"><Users size={15} className="text-gold-700" />{b.adults} {b.adults === 1 ? 'adult' : 'adults'}{b.children ? `, ${b.children} ${b.children === 1 ? 'child' : 'children'}` : ''}<span className="text-ink/40">·</span>Booked on {fmtDate(b.createdAt)}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          {b.mealPlan && (
            <div className="mb-4 rounded-2xl bg-white/50 p-4 text-sm">
              <p className="font-semibold">Meal plan: {b.mealPlan.name}</p>
              <p className="text-ink/75">{(b.mealPlan.includes || []).join(', ')} · {b.mealPlan.guests} {b.mealPlan.guests === 1 ? 'guest' : 'guests'} × {b.mealPlan.days} {b.mealPlan.days === 1 ? 'day' : 'days'} × {inr(b.mealPlan.pricePerPerson)} = <b>{inr(b.mealPlan.total)}</b></p>
            </div>
          )}
          <h4 className="flex items-center gap-2 text-lg font-semibold"><Utensils size={16} className="text-gold-700" />Food</h4>
          {(b.food || []).length === 0 ? <p className="mt-2 text-sm text-ink/70">No food ordered with this booking.</p> : (
            <ul className="mt-2 divide-y divide-ink/10 text-sm">
              {b.food.map((l) => <li key={`${l.item}-${l.name}`} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-2"><VegDot veg={l.veg} />{l.name} × {l.qty}</span><span className="font-medium">{inr(l.total)}</span></li>)}
            </ul>
          )}
          {canEditFood(b) && <button onClick={() => onFood(b)} className="bt-line bt-sm mt-3"><Utensils size={14} />{(b.food || []).length ? 'Change food order' : 'Add food'}</button>}
        </div>
        <div>
          <h4 className="text-lg font-semibold">Bill</h4>
          <div className="mt-2 text-sm">
            <div className={row}><span>Room ({b.nights} {b.nights === 1 ? 'night' : 'nights'})</span><span>{inr(b.subtotal)}</span></div>
            {b.discount > 0 && <div className={`${row} text-emerald-700`}><span className="flex items-center gap-1.5"><Tag size={13} />Coupon {b.couponCode}</span><span>− {inr(b.discount)}</span></div>}
            {b.mealTotal > 0 && <div className={row}><span>Meal plan</span><span>{inr(b.mealTotal)}</span></div>}
            {b.foodTotal > 0 && <div className={row}><span>Food</span><span>{inr(b.foodTotal)}</span></div>}
            <div className={row}><span>Taxes</span><span>{inr(b.taxes)}</span></div>
            <div className="mt-1 flex justify-between gap-4 border-t border-ink/10 pt-3 text-base font-semibold"><span>Total</span><span className="font-serif text-2xl">{inr(b.totalAmount)}</span></div>
            <p className="mt-1 text-xs text-ink/62">Payable at the property</p>
          </div>
        </div>
      </div>

      {b.specialRequests && <p className="mt-5 rounded-xl bg-white/45 p-3 text-sm text-ink/80"><b>Your request:</b> {b.specialRequests}</p>}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-ink/10 pt-5">
        {b.status !== 'cancelled' && <Link to={`/invoice/${b._id}`} target="_blank" className="bt-dark bt-sm"><FileText size={14} />Download invoice</Link>}
        {canCancel(b) && <button onClick={() => onCancel(b)} className="bt-line bt-sm text-red-700">Cancel booking</button>}
      </div>
    </article>
  );
}

export default function Account() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [foodFor, setFoodFor] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/bookings/mine').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const live = rows.filter((b) => b.status !== 'cancelled');
    return {
      total: rows.length,
      upcoming: rows.filter((b) => bucket(b) === 'upcoming').length,
      nights: rows.filter((b) => bucket(b) === 'past' && b.status !== 'cancelled').reduce((t, b) => t + (b.nights || 0), 0),
      spent: live.reduce((t, b) => t + (b.totalAmount || 0), 0),
    };
  }, [rows]);

  const shown = rows.filter((b) => tab === 'all' || bucket(b) === tab);
  const replace = (nb) => setRows((rs) => rs.map((r) => (r._id === nb._id ? nb : r)));

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.reference}?`)) return;
    try { const { data } = await api.patch(`/bookings/mine/${b._id}/cancel`); replace(data); setMsg({ text: `Booking ${b.reference} cancelled` }); } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };

  if (!ready) return <div className="wrap pb-32 pt-48 text-center text-ink/78">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  return (
    <div className="wrap max-w-5xl pb-24 pt-36 md:pt-44">
      <ProfileCard user={user} stats={stats} />

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl md:text-5xl">My bookings</h2>
        <Link to="/stay#book" className="bt-gold bt-sm">New booking</Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => {
          const n = k === 'all' ? rows.length : rows.filter((b) => bucket(b) === k).length;
          return <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-2 text-sm transition ${tab === k ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white/50 hover:border-gold-500'}`}>{label} ({n})</button>;
        })}
      </div>

      {msg && <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${msg.err ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{msg.text}</p>}

      <div className="mt-6 space-y-6">
        {loading ? <p className="text-center text-ink/70">Loading your bookings…</p>
          : error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          : shown.length === 0 ? (
            <div className="surface p-10 text-center"><CalendarDays size={34} className="mx-auto text-gold-500" /><h3 className="mt-4 text-3xl">{rows.length ? `No ${tab === 'all' ? '' : tab} bookings` : 'No bookings yet'}</h3><p className="mt-2 text-ink/78">{rows.length ? 'Try another tab.' : 'When you book a stay it will show up here, with food and invoice.'}</p><Link to="/stay#book" className="bt-dark mt-6">Book your stay</Link></div>
          ) : shown.map((b) => <BookingCard key={b._id} b={b} onFood={setFoodFor} onCancel={cancel} />)}
      </div>

      {foodFor && <FoodEditor booking={foodFor} onClose={() => setFoodFor(null)} onSaved={(nb) => { replace(nb); setFoodFor(null); setMsg({ text: 'Food order updated' }); }} />}
    </div>
  );
}
