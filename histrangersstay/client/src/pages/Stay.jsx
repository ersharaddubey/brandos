import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Check, MapPin, Clock, Star, CalendarCheck, Info, Navigation, MessageCircle, Tag, X, Utensils } from 'lucide-react';
import api, { errMsg, fmtDate, inr } from '../api';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { useProperty } from '../PropertyContext';
import { isoDay, paras } from '../lib/parse';
import { waUrl } from '../config';
import amenityIcon from '../components/amenityIcon';
import PageHero from '../components/PageHero';
import RoomCard from '../components/RoomCard';
import FoodMenu from '../components/FoodMenu';
import CustomBlocks from '../components/CustomBlocks';
import Reveal from '../components/Reveal';

const nextDay = (v) => new Date(new Date(v).getTime() + 86400000).toISOString().slice(0, 10);

export default function Stay() {
  const { settings } = useSettings();
  const { hotel, rooms, loading, error } = useProperty();
  const { user } = useAuth();
  const { hash } = useLocation();
  const [params] = useSearchParams();

  const [roomId, setRoomId] = useState(params.get('room') || '');
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || isoDay(1));
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || isoDay(2));
  const [adults, setAdults] = useState(Math.max(1, Number(params.get('guests')) || 2));
  const [children, setChildren] = useState(0);
  const [guest, setGuest] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [offerCode, setOfferCode] = useState(params.get('offer') || '');
  const [coupon, setCoupon] = useState(null);          // applied coupon from the server { code, title, discount, message }
  const [couponErr, setCouponErr] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});                 // { foodId: qty }
  const autoApplied = useRef(false);
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(null);
  const [foodPrompt, setFoodPrompt] = useState(false);   // "please add your food" popup

  useEffect(() => { if (rooms.length && !rooms.find((r) => r._id === roomId)) setRoomId(rooms[0]._id); }, [rooms, roomId]);
  useEffect(() => {
    if (hash === '#book' && !loading) setTimeout(() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [hash, loading]);

  const room = rooms.find((r) => r._id === roomId);
  const nights = useMemo(() => Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)), [checkIn, checkOut]);
  const subtotal = room ? nights * room.pricePerNight : 0;

  // Food chosen from the menu
  const foodLines = useMemo(() => menu.filter((f) => cart[f._id] > 0).map((f) => ({ ...f, qty: cart[f._id], total: f.price * cart[f._id] })), [menu, cart]);
  const foodTotal = foodLines.reduce((t, l) => t + l.total, 0);
  const foodCount = foodLines.reduce((t, l) => t + l.qty, 0);
  const setQty = (id, n) => setCart((c) => { const next = { ...c }; if (n <= 0) delete next[id]; else next[id] = n; return next; });

  // Same formula as the server: tax is charged on (room charges - discount + food)
  const discount = coupon ? Math.min(coupon.discount || 0, subtotal) : 0;
  const taxable = Math.max(0, subtotal - discount) + foodTotal;
  const taxes = Math.round(taxable * (settings.taxPercent / 100));
  const grandTotal = taxable + taxes;

  useEffect(() => { api.get('/food').then((r) => setMenu(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);

  // Ask the server whether the code works for this room and these dates
  const applyCoupon = async (codeArg) => {
    const code = String(codeArg ?? offerCode).trim();
    if (!code) { setCouponErr('Enter a coupon code'); return; }
    if (!room || nights < 1) { setCouponErr('Choose a room and valid dates first'); return; }
    setCouponBusy(true); setCouponErr('');
    try {
      const { data } = await api.post('/offers/validate', { code, room: room._id, checkIn, checkOut });
      setCoupon(data); setOfferCode(data.code);
    } catch (err) {
      setCoupon(null); setCouponErr(errMsg(err));
    } finally { setCouponBusy(false); }
  };
  const removeCoupon = () => { setCoupon(null); setCouponErr(''); setOfferCode(''); };

  // "Use offer" links open this page with ?offer=CODE: apply it automatically once prices are visible
  useEffect(() => {
    if (autoApplied.current || !user || !room || nights < 1) return;
    const fromLink = params.get('offer');
    if (!fromLink) return;
    autoApplied.current = true;
    applyCoupon(fromLink);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room, nights]);

  // If the room or dates change after applying, check the code again so the discount stays correct
  useEffect(() => {
    if (coupon && room && nights > 0) applyCoupon(coupon.code);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, checkIn, checkOut]);

  // Actually creates the booking (called directly, or after the guest picks "No thanks" in the food popup)
  const placeBooking = async () => {
    setFormError('');
    if (!room) return setFormError('Please choose a room');
    if (nights < 1) return setFormError('Check-out must be after check-in');
    setBusy(true);
    try {
      const food = foodLines.map((l) => ({ item: l._id, qty: l.qty }));
      const { data } = await api.post('/bookings', {
        room: room._id, checkIn, checkOut, adults, children, guest,
        coupon: (coupon?.code || offerCode).trim(), food, specialRequests: requests.trim(),
      });
      setDone(data);
      setCart({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!room) return setFormError('Please choose a room');
    if (nights < 1) return setFormError('Check-out must be after check-in');
    // No food chosen: ask once before booking
    if (foodLines.length === 0 && menu.length > 0) { setFoodPrompt(true); return; }
    placeBooking();
  };

  const goToMenu = () => {
    setFoodPrompt(false);
    setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const skipFood = () => { setFoodPrompt(false); placeBooking(); };

  if (loading) return <div className="wrap pb-32 pt-48 text-center text-ink/78">Loading…</div>;
  if (!hotel) return (
    <div className="wrap max-w-xl pb-32 pt-48 text-center">
      <h1 className="text-5xl">Stay details unavailable</h1>
      <p className="mt-4 text-ink/78">{error ? 'Could not reach the server. Start the API (npm run dev:server) and refresh.' : 'No property has been added yet. Add it in Admin → Hotels.'}</p>
      <Link to="/" className="bt-dark mt-8">Back to home</Link>
    </div>
  );

  if (done) return (
    <div className="wrap max-w-2xl pb-28 pt-40">
      <div className="surface animate-pop p-8 text-center md:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Check size={32} /></span>
        <h1 className="mt-5 text-5xl">Booking received</h1>
        <p className="mt-3 text-ink/80">Thank you, {done.guest.name}. Your reservation at {hotel.name} is pending confirmation. We will contact you at {done.guest.email}.</p>
        <p className="mt-6 glass rounded-2xl py-4 text-sm uppercase tracking-widest text-ink/78">Booking reference <b className="ml-2 font-mono text-lg tracking-[0.2em] text-ink">{done.reference}</b></p>
        <dl className="mt-6 divide-y divide-ink/10 text-left">
          {[
            ['Room', room?.name],
            ['Check-in', fmtDate(done.checkIn)],
            ['Check-out', `${fmtDate(done.checkOut)} (${done.nights} ${done.nights === 1 ? 'night' : 'nights'})`],
            ['Room charges', inr(done.subtotal)],
            done.discount > 0 && [`Coupon ${done.couponCode} (${done.discountPercent}% off)`, `− ${inr(done.discount)}`],
            ...(done.food || []).map((l) => [`${l.name} × ${l.qty}`, inr(l.total)]),
            ['Taxes', inr(done.taxes)],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink/70">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
          ))}
          <div className="flex justify-between gap-4 py-3 text-lg"><dt>Total, payable at the property</dt><dd className="font-serif text-2xl font-semibold">{inr(done.totalAmount)}</dd></div>
        </dl>
        {done.couponCode && done.discount === 0 && <p className="mt-3 text-sm text-gold-700">Offer applied: {done.couponTitle}</p>}
        <p className="mt-4 text-sm text-ink/68">{user ? 'You can see this booking, add food and download the invoice anytime from My account.' : 'Keep your reference and email to look up this booking later.'}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? <Link className="bt-dark" to="/account">My bookings and invoice</Link> : <Link className="bt-dark" to="/booking">Find my booking</Link>}
          {settings.whatsapp && <a className="bt-line" target="_blank" rel="noreferrer" href={`${waUrl(settings.whatsapp)}?text=${encodeURIComponent(`Hi, I just booked (ref ${done.reference}). Please confirm.`)}`}><MessageCircle size={16} />Confirm on WhatsApp</a>}
        </div>
      </div>
    </div>
  );

  const amenities = hotel.amenities || [];
  const includes = settings.stayIncludes || [];
  const rules = settings.policies || [];

  return (
    <>
      <PageHero eyebrow="Stay" title={hotel.name} text={hotel.tagline} img={hotel.images?.[0]}>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/85">
          <span className="flex items-center gap-2"><MapPin size={16} className="text-gold-300" />{hotel.city}{hotel.state ? `, ${hotel.state}` : ''}</span>
          {settings.reviewScore > 0 && <span className="flex items-center gap-2"><Star size={16} className="text-gold-300" fill="currentColor" />{Number(settings.reviewScore).toFixed(1)} {settings.reviewLabel}</span>}
          {settings.checkInTime && <span className="flex items-center gap-2"><Clock size={16} className="text-gold-300" />Check-in {settings.checkInTime}</span>}
        </div>
      </PageHero>

      <div className="wrap grid gap-12 pb-20 pt-16 lg:grid-cols-[1fr_400px] lg:gap-14 lg:pb-28">
        <div className="min-w-0 space-y-20">
          <Reveal>
            <p className="eyebrow">About the stay</p>
            <h2 className="mt-3 text-4xl md:text-5xl">{hotel.type} in the hills</h2>
            <div className="copy mt-5">{paras(hotel.description).map((t, i) => <p key={i}>{t}</p>)}</div>
            {amenities.length > 0 && (
              <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
                {amenities.map((a) => { const Icon = amenityIcon(a); return <li key={a} className="flex items-center gap-3 glass rounded-2xl px-4 py-3.5 text-sm"><Icon size={19} className="shrink-0 text-gold-700" />{a}</li>; })}
              </ul>
            )}
          </Reveal>

          <div>
            <Reveal><p className="eyebrow">Rooms</p><h2 className="mb-8 mt-3 text-4xl md:text-5xl">Choose your room</h2></Reveal>
            {rooms.length === 0 ? <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/70">No rooms are listed yet. Add rooms in Admin → Rooms.</p> : (
              <div className="grid gap-7 md:grid-cols-2">
                {rooms.map((r) => <RoomCard key={r._id} room={r} selected={r._id === roomId} onSelect={() => { setRoomId(r._id); document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }); }} />)}
              </div>
            )}
          </div>

          <div id="menu" className="scroll-mt-28">
            <Reveal>
              <p className="eyebrow">Food menu</p>
              <h2 className="mb-2 mt-3 text-4xl md:text-5xl">Add food to your stay</h2>
              <p className="mb-8 max-w-2xl text-ink/78">Order meals along with your room. Items you add here are booked together with your stay and shown in your invoice.</p>
            </Reveal>
            <FoodMenu items={menu} qty={cart} onQty={setQty} canOrder />
            {foodCount > 0 && (
              <p className="mt-6 flex items-center gap-2 rounded-2xl bg-gold-50 px-5 py-3 text-sm text-ink/85"><Utensils size={16} className="text-gold-700" />{foodCount} {foodCount === 1 ? 'item' : 'items'} added, {inr(foodTotal)}. See your total in the booking form.</p>
            )}
          </div>

          {includes.length > 0 && (
            <Reveal className="surface p-8 md:p-10">
              <h3 className="text-3xl">Included in every room</h3>
              <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {includes.map((x) => <li key={x} className="flex items-center gap-3 text-ink/88"><Check size={18} className="shrink-0 text-gold-700" />{x}</li>)}
              </ul>
            </Reveal>
          )}

          {settings.stayInfo && (
            <Reveal><h3 className="text-3xl">Good to know</h3><div className="copy mt-4">{paras(settings.stayInfo).map((t, i) => <p key={i}>{t}</p>)}</div></Reveal>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {settings.howToReach && (
              <Reveal className="surface p-8">
                <Navigation size={26} className="text-gold-700" /><h3 className="mt-4 text-2xl">How to reach us</h3>
                <p className="copy mt-3">{settings.howToReach}</p>
                {settings.mapLink && <a href={settings.mapLink} target="_blank" rel="noreferrer" className="bt-line bt-sm mt-5">Open in Maps</a>}
              </Reveal>
            )}
            {(rules.length > 0 || settings.checkInTime) && (
              <Reveal delay={100} className="surface p-8">
                <Info size={26} className="text-gold-700" /><h3 className="mt-4 text-2xl">House rules</h3>
                {settings.checkInTime && <p className="mt-3 text-sm text-ink/78">Check-in {settings.checkInTime} · Check-out {settings.checkOutTime}</p>}
                <ul className="mt-3 space-y-2 text-[0.93rem] text-ink/85">{rules.slice(0, 5).map((r) => <li key={r} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />{r}</li>)}</ul>
                <Link to="/faq" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:underline">All rules and FAQ</Link>
              </Reveal>
            )}
          </div>
        </div>

        {/* Booking form */}
        <aside id="book" className="scroll-mt-28 lg:self-start">
          <form onSubmit={submit} className="surface p-7 lg:sticky lg:top-28">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><CalendarCheck size={21} /></span><h3 className="text-3xl">Reserve your stay</h3></div>
            <p className="mt-3 text-sm text-ink/70">{room ? (user ? `${room.name} · ${inr(room.pricePerNight)} per night` : `${room.name} · log in to see price`) : 'Select a room'}</p>

            {rooms.length > 1 && (
              <label className="mt-5 block"><span className="lbl">Room</span>
                <select className="inp" value={roomId} onChange={(e) => setRoomId(e.target.value)}>{rooms.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}</select></label>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label><span className="lbl">Check-in</span><input className="inp" type="date" min={isoDay(0)} value={checkIn} required onChange={(e) => { const v = e.target.value; setCheckIn(v); if (checkOut <= v) setCheckOut(nextDay(v)); }} /></label>
              <label><span className="lbl">Check-out</span><input className="inp" type="date" min={checkIn} value={checkOut} required onChange={(e) => setCheckOut(e.target.value)} /></label>
              <label><span className="lbl">Adults</span><select className="inp" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></label>
              <label><span className="lbl">Children</span><select className="inp" value={children} onChange={(e) => setChildren(Number(e.target.value))}>{[0, 1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block"><span className="lbl">Full name</span><input className="inp" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} required /></label>
              <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required /></label>
              <label className="block"><span className="lbl">Phone</span><input className="inp" type="tel" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required /></label>
              <div>
                <span className="lbl">Coupon code (optional)</span>
                {coupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span className="flex items-center gap-2"><Tag size={15} /><b className="font-mono tracking-widest">{coupon.code}</b>{coupon.discount > 0 ? <>saves {inr(coupon.discount)}</> : <>applied</>}</span>
                    <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="rounded-full p-1 hover:bg-emerald-100"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className="inp min-w-0 flex-1 font-mono uppercase tracking-widest" value={offerCode} onChange={(e) => { setOfferCode(e.target.value); setCouponErr(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} placeholder="e.g. STAY3" />
                    <button type="button" className="bt-dark bt-sm shrink-0" onClick={() => applyCoupon()} disabled={couponBusy || !offerCode.trim()}>{couponBusy ? '…' : 'Apply'}</button>
                  </div>
                )}
                {coupon && <p className="mt-1.5 text-xs text-emerald-700">{coupon.message}</p>}
                {couponErr && <p className="mt-1.5 text-xs text-red-600">{couponErr}</p>}
              </div>
              <label className="block"><span className="lbl">Special requests (optional)</span><textarea className="inp" rows="2" value={requests} onChange={(e) => setRequests(e.target.value)} /></label>
            </div>

            {room && nights > 0 && (
              <div className="mt-5 glass rounded-2xl p-5 text-sm">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>{inr(room.pricePerNight)} × {nights} {nights === 1 ? 'night' : 'nights'}</span><span>{inr(subtotal)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon {coupon.code}</span><span>− {inr(discount)}</span></div>}
                    {foodLines.map((l) => <div key={l._id} className="flex justify-between text-ink/85"><span className="pr-3">{l.name} × {l.qty}</span><span>{inr(l.total)}</span></div>)}
                    <div className="flex justify-between"><span>Taxes ({settings.taxPercent}%)</span><span>{inr(taxes)}</span></div>
                    <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><span>Total</span><span className="font-serif text-2xl">{inr(grandTotal)}</span></div>
                    <a href="#menu" className="mt-1 flex items-center justify-center gap-2 pt-1 text-xs font-medium text-gold-700 hover:underline"><Utensils size={13} />{foodCount ? 'Change food order' : 'Add food from the menu'}</a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {foodLines.map((l) => <div key={l._id} className="flex justify-between text-ink/85"><span className="pr-3">{l.name} × {l.qty}</span><span>{inr(l.total)}</span></div>)}
                    {foodLines.length > 0 && <div className="flex justify-between border-t border-ink/10 pt-2 font-medium"><span>Food total (before tax)</span><span>{inr(foodTotal)}</span></div>}
                    <a href="#menu" className="flex items-center justify-center gap-2 pt-1 text-xs font-medium text-gold-700 hover:underline"><Utensils size={13} />{foodCount ? 'Change food order' : 'Add food from the menu'}</a>
                    <p className="pt-2 text-center text-ink/80">Room price and final total are visible after you register or log in.</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <Link className="bt-gold bt-sm" to="/register" state={{ from: '/stay' }}>Register</Link>
                      <Link className="bt-line bt-sm" to="/login" state={{ from: '/stay' }}>Log in</Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            {formError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
            <button className="bt-gold mt-5 w-full" disabled={busy || !room}>{busy ? 'Reserving…' : 'Reserve now'}</button>
            <p className="mt-4 text-center text-xs text-ink/68">No online payment. You pay at the property.</p>
            {user && <p className="mt-2 text-center text-xs text-ink/68">After booking, find it and your invoice in <Link className="text-gold-700 hover:underline" to="/account">My account</Link>.</p>}
          </form>
        </aside>
      </div>
      {foodPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/50 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add food to your booking" onClick={goToMenu}>
          <div className="surface animate-pop w-full max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700"><Utensils size={26} /></span>
            <h3 className="mt-4 text-3xl">Please add your food</h3>
            <p className="mt-2 text-sm text-ink/75">You have not added any food yet. Choose your meals now and they will be added to your bill.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" className="bt-gold" onClick={goToMenu}>Add food</button>
              <button type="button" className="bt-line" onClick={skipFood} disabled={busy}>{busy ? 'Reserving…' : 'No thanks'}</button>
            </div>
          </div>
        </div>
      )}
      <CustomBlocks page="stay" />
    </>
  );
}