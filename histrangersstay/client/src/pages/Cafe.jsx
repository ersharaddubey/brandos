import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Utensils, QrCode, User, Receipt, BedDouble } from 'lucide-react';
import api, { errMsg, inr } from '../api';
import { useAuth } from '../AuthContext';
import { cameViaQr, clearGuest, digits, getGuest, getOrders, getTable, markQr, rememberOrder, saveGuest, saveTable } from '../lib/cafeGuest';
import FoodMenu from '../components/FoodMenu';
import FoodReviews from '../components/FoodReviews';
import StayFoodPanel from '../components/StayFoodPanel';
import PageTop from '../components/PageTop';

// "5" -> "Table 5"; a custom QR label such as "Garden 2" stays as it is
const tableName = (t) => (t ? (/^\d+$/.test(t) ? `Table ${t}` : t) : '');

// Guest login: name + phone, no password. Shown to people who scan the cafe QR code.
function GuestGate({ onGuest, from }) {
  const [g, setG] = useState({ name: '', phone: '' });
  const [err, setErr] = useState('');
  const go = (e) => {
    e.preventDefault();
    if (!g.name.trim()) return setErr('Please enter your name');
    if (digits(g.phone).length < 10) return setErr('Please enter a valid 10-digit phone number');
    onGuest(saveGuest(g));
  };
  return (
    <form onSubmit={go} className="space-y-4 rounded-2xl bg-gold-50 p-5">
      <h3 className="flex items-center gap-2 text-xl"><User size={18} className="text-gold-700" />Continue as guest</h3>
      <p className="text-sm text-ink/75">No password and no account. We only need your name and phone so the kitchen can call you and print your bill.</p>
      <label className="block"><span className="lbl">Your name</span><input className="inp" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} autoComplete="name" required /></label>
      <label className="block"><span className="lbl">Phone</span><input className="inp" type="tel" inputMode="numeric" value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} autoComplete="tel" required /></label>
      {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</p>}
      <button className="bt-gold w-full">Continue as guest</button>
      <p className="text-center text-xs text-ink/65">Have an account? <Link className="font-medium text-gold-700 hover:underline" to="/login" state={{ from }}>Log in</Link> or <Link className="font-medium text-gold-700 hover:underline" to="/register" state={{ from }}>Register</Link></p>
    </form>
  );
}

export default function Cafe() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  // Two options on this page: order from the cafe (default) or add food to a room booking (?mode=stay)
  const mode = sp.get('mode') === 'stay' ? 'stay' : 'order';
  const setMode = (m) => setSp((prev) => { const n = new URLSearchParams(prev); if (m === 'stay') n.set('mode', 'stay'); else n.delete('mode'); return n; }, { replace: true });
  const tableParam = (sp.get('table') || '').trim().slice(0, 20);
  const qrParam = sp.get('qr') === '1' || !!tableParam;

  // Arriving from the table QR code (/cafe?table=5&qr=1): remember the table and the QR visit for this browser session
  const [table, setTable] = useState(() => tableParam || getTable());
  const [viaQr] = useState(() => { if (qrParam) markQr(); return qrParam || cameViaQr(); });
  useEffect(() => { if (tableParam) { saveTable(tableParam); setTable(tableParam); } }, [tableParam]);

  const [guest, setGuest] = useState(getGuest);
  const identity = user ? { kind: 'account', name: user.name || '', phone: user.phone || '' } : guest ? { kind: 'guest', name: guest.name, phone: guest.phone } : null;

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [stayCart, setStayCart] = useState({});   // food for a room booking (mode=stay), kept apart from the cafe order
  const [f, setF] = useState({ name: '', phone: '', orderType: 'dine-in', place: tableName(table), note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => { api.get('/food').then((r) => setMenu(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);
  // Name and phone follow whoever is logged in (guest or account)
  useEffect(() => { if (identity) setF((p) => ({ ...p, name: identity.name, phone: identity.phone })); }, [identity?.kind, identity?.name, identity?.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (table) setF((p) => ({ ...p, place: tableName(table), orderType: p.orderType === 'takeaway' ? p.orderType : 'dine-in' })); }, [table]);

  const setQtyIn = (setter) => (id, n) => setter((c) => { const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x; });
  const setQty = setQtyIn(setCart);
  const setStayQty = setQtyIn(setStayCart);
  const lines = useMemo(() => menu.filter((m) => cart[m._id] > 0).map((m) => ({ ...m, qty: cart[m._id], total: m.price * cart[m._id] })), [menu, cart]);
  const total = lines.reduce((t, l) => t + l.total, 0);
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const stayLines = menu.filter((m) => stayCart[m._id] > 0);
  const barCount = mode === 'stay' ? stayLines.reduce((t, m) => t + stayCart[m._id], 0) : count;
  const barTotal = mode === 'stay' ? stayLines.reduce((t, m) => t + m.price * stayCart[m._id], 0) : total;

  const changeGuest = () => { clearGuest(); setGuest(null); };
  const myOrders = identity ? getOrders().filter((o) => digits(o.phone) === digits(identity.phone)).slice(0, 5) : [];

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!identity) return setError('Please continue as guest or log in first');
    if (!lines.length) return setError('Please add at least one item from the menu');
    setBusy(true);
    try {
      const { data } = await api.post('/cafe', {
        ...f,
        items: lines.map((l) => ({ item: l._id, qty: l.qty })),
        source: viaQr ? 'qr' : 'web',
        guest: identity.kind === 'guest',
      });
      rememberOrder({ orderNo: data.orderNo, phone: data.customer.phone, total: data.total });
      setDone(data); setCart({}); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="wrap max-w-xl pb-28 pt-36 sm:pt-44">
      <div className="surface p-8 text-center md:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/50 text-gold-700"><Check size={32} /></span>
        <h1 className="mt-5 text-4xl">Order placed</h1>
        <p className="mt-2 text-ink/80">Thank you, {done.customer.name}. We are preparing your food{done.place ? ` for ${done.place}` : ''}.</p>
        <p className="mt-5 glass rounded-2xl py-3 text-sm uppercase tracking-widest text-ink/78">Order no <b className="ml-2 font-mono text-lg tracking-[0.2em] text-ink">{done.orderNo}</b></p>
        <dl className="mt-5 divide-y divide-ink/10 text-left text-sm">
          {done.items.map((l) => <div key={l.name} className="flex justify-between gap-4 py-2"><dt>{l.name} × {l.qty}</dt><dd>{inr(l.total)}</dd></div>)}
          <div className="flex justify-between gap-4 py-3 text-base font-semibold"><dt>Total (GST included)</dt><dd className="font-serif text-xl">{inr(done.total)}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="bt-gold" to={`/cafe-bill/${done.orderNo}?phone=${encodeURIComponent(done.customer.phone)}`}>View and print bill</Link>
          <button className="bt-line" onClick={() => setDone(null)}>Order more</button>
        </div>
        <p className="mt-4 text-xs text-ink/65">Pay at the cafe counter. Your order stays listed on this phone under “Your recent orders”.</p>
      </div>
    </div>
  );

  return (
    <>
      <PageTop
        eyebrow="Hi Strangers Cafe"
        title={mode === 'stay' ? 'Add food to your stay' : 'Order food, get your bill'}
        text={mode === 'stay' ? 'Pick dishes and they are added to your room booking and invoice.' : 'Pick your dishes and pay at the cafe. Prices include GST.'}
      />

      <div className="wrap max-w-3xl pb-8">
        <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Cafe options">
          {[
            ['order', Utensils, 'Order from the cafe', 'Dine in, takeaway or to your room'],
            ['stay', BedDouble, 'Add food to your stay', 'Added to your room booking bill'],
          ].map(([key, Icon, title, sub]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${mode === key ? 'border-gold-500 bg-gold-50 ring-2 ring-gold-500/40' : 'border-ink/15 bg-white/60 hover:border-gold-500'}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${mode === key ? 'bg-gold-500 text-white' : 'bg-white text-gold-700'}`}><Icon size={20} /></span>
              <span className="min-w-0"><b className="block text-[1.05rem] leading-tight">{title}</b><span className="mt-0.5 block text-sm text-ink/70">{sub}</span></span>
            </button>
          ))}
        </div>
      </div>

      {viaQr && mode === 'order' && (
        <div className="wrap max-w-5xl pb-8">
          <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gold-50 px-6 py-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/70 text-gold-700"><QrCode size={24} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-2xl leading-tight">Welcome{identity ? `, ${identity.name.split(' ')[0]}` : ''}!{table ? ` You are at ${tableName(table)}.` : ''}</p>
              <p className="text-sm text-ink/75">{identity ? 'Add your dishes from the menu and place the order. It goes straight to the kitchen.' : 'Look through the menu, add dishes, then continue as guest to send your order. No account needed.'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="wrap grid gap-8 pb-32 lg:grid-cols-[1fr_380px] lg:gap-10 lg:pb-24">
        <div className="min-w-0">
          <FoodMenu
            items={menu}
            qty={mode === 'stay' ? stayCart : cart}
            onQty={mode === 'stay' ? setStayQty : setQty}
            canOrder
            focusCat={sp.get('cat') || ''}
          />
        </div>
        <aside id="order-panel" className="scroll-mt-28 space-y-5 lg:self-start">
          {mode === 'stay' ? (
            <StayFoodPanel menu={menu} cart={stayCart} setCart={setStayCart} />
          ) : (
          <div className="surface space-y-4 p-6 lg:sticky lg:top-28">
            <h2 className="flex items-center gap-2 text-2xl"><Utensils size={20} className="text-gold-700" />Your order</h2>
            {lines.length === 0 ? <p className="text-sm text-ink/65">Nothing added yet. Tap “Add” on a dish.</p> : (
              <div className="space-y-1.5 text-sm">
                {lines.map((l) => <div key={l._id} className="flex justify-between gap-3"><span>{l.name} × {l.qty}</span><span>{inr(l.total)}</span></div>)}
                <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold"><span>Total ({count} {count === 1 ? 'item' : 'items'})</span><span className="font-serif text-xl">{inr(total)}</span></div>
              </div>
            )}

            {!identity ? (
              <GuestGate onGuest={setGuest} from="/cafe" />
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {identity.kind === 'guest' ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-gold-50 px-4 py-3 text-sm">
                    <span className="min-w-0"><span className="block text-[0.65rem] uppercase tracking-widest text-ink/60">Guest</span><b className="block truncate">{identity.name}</b><span className="text-ink/70">{identity.phone}</span></span>
                    <button type="button" onClick={changeGuest} className="shrink-0 text-xs font-medium text-gold-700 hover:underline">Not you?</button>
                  </div>
                ) : (
                  <>
                    <label className="block"><span className="lbl">Your name</span><input className="inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
                    <label className="block"><span className="lbl">Phone</span><input className="inp" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></label>
                  </>
                )}
                <label className="block"><span className="lbl">Order type</span>
                  <select className="inp" value={f.orderType} onChange={(e) => setF({ ...f, orderType: e.target.value })}><option value="dine-in">Dine in (cafe)</option><option value="takeaway">Takeaway</option><option value="room">Serve in my room</option></select></label>
                {f.orderType !== 'takeaway' && <label className="block"><span className="lbl">{f.orderType === 'room' ? 'Room name / number' : 'Table number (optional)'}</span><input className="inp" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>}
                <label className="block"><span className="lbl">Note for the kitchen (optional)</span><textarea className="inp" rows="2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
                {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button className="bt-gold w-full" disabled={busy}>{busy ? 'Placing…' : `Place order${total ? ` · ${inr(total)}` : ''}`}</button>
              </form>
            )}
          </div>
          )}

          {mode === 'order' && myOrders.length > 0 && (
            <div className="surface p-6">
              <h3 className="flex items-center gap-2 text-xl"><Receipt size={18} className="text-gold-700" />Your recent orders</h3>
              <ul className="mt-3 divide-y divide-ink/10 text-sm">
                {myOrders.map((o) => (
                  <li key={o.orderNo} className="flex items-center justify-between gap-3 py-2">
                    <span><b className="font-mono tracking-wider">{o.orderNo}</b><span className="ml-2 text-ink/65">{inr(o.total)}</span></span>
                    <Link className="text-gold-700 hover:underline" to={`/cafe-bill/${o.orderNo}?phone=${encodeURIComponent(o.phone)}`}>Bill</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <FoodReviews />

      {/* Phones: the order panel sits below the menu, so keep a shortcut to it in view */}
      {barCount > 0 && (
        <button
          type="button"
          onClick={() => document.getElementById('order-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-white shadow-lift md:bottom-5 lg:hidden"
        >
          <span>{barCount} {barCount === 1 ? 'item' : 'items'} · {inr(barTotal)}</span>
          <span className="text-gold-300">{mode === 'stay' ? 'View booking' : 'View order'} ↓</span>
        </button>
      )}
    </>
  );
}
