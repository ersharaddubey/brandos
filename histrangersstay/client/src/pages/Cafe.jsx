import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Utensils } from 'lucide-react';
import api, { errMsg, inr } from '../api';
import FoodMenu from '../components/FoodMenu';
import PageTop from '../components/PageTop';

export default function Cafe() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [f, setF] = useState({ name: '', phone: '', orderType: 'dine-in', place: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => { api.get('/food').then((r) => setMenu(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);
  const setQty = (id, n) => setCart((c) => { const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x; });
  const lines = useMemo(() => menu.filter((m) => cart[m._id] > 0).map((m) => ({ ...m, qty: cart[m._id], total: m.price * cart[m._id] })), [menu, cart]);
  const total = lines.reduce((t, l) => t + l.total, 0);
  const count = lines.reduce((t, l) => t + l.qty, 0);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!lines.length) return setError('Please add at least one item from the menu');
    setBusy(true);
    try {
      const { data } = await api.post('/cafe', { ...f, items: lines.map((l) => ({ item: l._id, qty: l.qty })) });
      setDone(data); setCart({}); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="wrap max-w-xl pb-28 pt-44">
      <div className="surface p-8 text-center md:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/50 text-gold-700"><Check size={32} /></span>
        <h1 className="mt-5 text-4xl">Order placed</h1>
        <p className="mt-2 text-ink/80">Thank you, {done.customer.name}. We are preparing your food.</p>
        <p className="mt-5 glass rounded-2xl py-3 text-sm uppercase tracking-widest text-ink/78">Order no <b className="ml-2 font-mono text-lg tracking-[0.2em] text-ink">{done.orderNo}</b></p>
        <dl className="mt-5 divide-y divide-ink/10 text-left text-sm">
          {done.items.map((l) => <div key={l.name} className="flex justify-between gap-4 py-2"><dt>{l.name} × {l.qty}</dt><dd>{inr(l.total)}</dd></div>)}
          <div className="flex justify-between gap-4 py-3 text-base font-semibold"><dt>Total (GST included)</dt><dd className="font-serif text-xl">{inr(done.total)}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="bt-gold" to={`/cafe-bill/${done.orderNo}?phone=${encodeURIComponent(done.customer.phone)}`}>View and print bill</Link>
          <button className="bt-line" onClick={() => setDone(null)}>Order more</button>
        </div>
        <p className="mt-4 text-xs text-ink/65">Pay at the cafe counter. Keep your order number and phone to open this bill later.</p>
      </div>
    </div>
  );

  return (
    <>
      <PageTop eyebrow="Hi Strangers Cafe" title="Order food, get your bill" text="Pick your dishes, tell us where to serve them, and pay at the cafe. Prices include GST." />
      <div className="wrap grid gap-10 pb-24 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0"><FoodMenu items={menu} qty={cart} onQty={setQty} canOrder /></div>
        <aside className="lg:self-start">
          <form onSubmit={submit} className="surface space-y-4 p-6 lg:sticky lg:top-28">
            <h2 className="flex items-center gap-2 text-2xl"><Utensils size={20} className="text-gold-700" />Your order</h2>
            {lines.length === 0 ? <p className="text-sm text-ink/65">Nothing added yet.</p> : (
              <div className="space-y-1.5 text-sm">
                {lines.map((l) => <div key={l._id} className="flex justify-between gap-3"><span>{l.name} × {l.qty}</span><span>{inr(l.total)}</span></div>)}
                <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold"><span>Total ({count} {count === 1 ? 'item' : 'items'})</span><span className="font-serif text-xl">{inr(total)}</span></div>
              </div>
            )}
            <label className="block"><span className="lbl">Your name</span><input className="inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
            <label className="block"><span className="lbl">Phone</span><input className="inp" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></label>
            <label className="block"><span className="lbl">Order type</span>
              <select className="inp" value={f.orderType} onChange={(e) => setF({ ...f, orderType: e.target.value })}><option value="dine-in">Dine in (cafe)</option><option value="takeaway">Takeaway</option><option value="room">Serve in my room</option></select></label>
            {f.orderType !== 'takeaway' && <label className="block"><span className="lbl">{f.orderType === 'room' ? 'Room name / number' : 'Table number (optional)'}</span><input className="inp" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>}
            <label className="block"><span className="lbl">Note for the kitchen (optional)</span><textarea className="inp" rows="2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button className="bt-gold w-full" disabled={busy}>{busy ? 'Placing…' : `Place order${total ? ` · ${inr(total)}` : ''}`}</button>
          </form>
        </aside>
      </div>
    </>
  );
}
