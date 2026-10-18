import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, Search } from 'lucide-react';
import { isoDay } from '../lib/parse';

const next = (v) => new Date(new Date(v).getTime() + 86400000).toISOString().slice(0, 10);

// Single-property booking bar: pick dates and guests, land on the Stay page with the form filled in
export default function BookingBar({ className = '' }) {
  const nav = useNavigate();
  const [f, setF] = useState({ checkIn: isoDay(1), checkOut: isoDay(2), guests: 2 });

  const submit = (e) => {
    e.preventDefault();
    nav(`/stay?checkIn=${f.checkIn}&checkOut=${f.checkOut}&guests=${f.guests}#book`);
  };
  const box = 'flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/50 md:px-5';
  const inp = 'w-full bg-transparent text-[1rem] font-medium text-ink focus:outline-none';
  const lab = 'text-[0.62rem] font-medium uppercase tracking-[0.2em] text-ink/68';

  return (
    <form onSubmit={submit} className={`grid gap-2 glass-strong rounded-[1.75rem] p-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-center ${className}`}>
      <label className={box}><CalendarDays size={20} className="shrink-0 text-gold-500" />
        <span className="w-full"><span className={lab}>Check-in</span>
          <input className={inp} type="date" min={isoDay(0)} value={f.checkIn} required
            onChange={(e) => { const v = e.target.value; setF({ ...f, checkIn: v, checkOut: f.checkOut <= v ? next(v) : f.checkOut }); }} /></span>
      </label>
      <label className={box}><CalendarDays size={20} className="shrink-0 text-gold-500" />
        <span className="w-full"><span className={lab}>Check-out</span>
          <input className={inp} type="date" min={f.checkIn} value={f.checkOut} required onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></span>
      </label>
      <label className={box}><Users size={20} className="shrink-0 text-gold-500" />
        <span className="w-full"><span className={lab}>Guests</span>
          <select className={inp} value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
          </select></span>
      </label>
      <button className="bt-gold h-full min-h-[3.5rem] rounded-2xl sm:col-span-2 md:col-span-1 md:px-9" type="submit"><Search size={17} />Check rooms</button>
    </form>
  );
}
