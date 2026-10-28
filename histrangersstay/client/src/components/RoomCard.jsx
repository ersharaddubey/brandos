import { Link } from 'react-router-dom';
import { Users, BedDouble, Maximize2, Lock, Check } from 'lucide-react';
import SmartImg from './SmartImg';
import { inr } from '../api';
import { useAuth } from '../AuthContext';
import { bedLabel } from '../lib/parse';

// Used on the home page (links to /stay) and on the Stay page (selectable)
// availability (Stay page only): { left, available } for the chosen dates. Undefined = unknown, card behaves as before.
export default function RoomCard({ room, selected = false, onSelect, to, from = '/stay', availability }) {
  const { user } = useAuth();
  const soldOut = availability?.available === false;
  const fewLeft = availability?.available && availability.left <= 3;
  const spec = 'flex items-center gap-1.5 text-[0.82rem] text-ink/78';
  return (
    <article className={`tilt group flex h-full flex-col glass overflow-hidden rounded-3xl border transition duration-500 hover:shadow-glass-lg ${soldOut ? 'opacity-70 grayscale-[0.6]' : ''} ${selected ? 'border-gold-500 ring-2 ring-gold-500/40' : 'border-ink/5'}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-ink/5 to-ink/10">
        <SmartImg src={room.images?.[0]} alt={room.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60 transition duration-500 group-hover:opacity-90" />
        <span className="absolute left-4 top-4 rounded-full bg-black/55 border border-white/25 px-3.5 py-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-white backdrop-blur-md shadow-sm">{room.type}</span>
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-white">Sold out for your dates</span>}
        {fewLeft && <span className="absolute bottom-4 left-4 rounded-full bg-amber-500 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-white shadow">Only {availability.left} left</span>}
        {selected && !soldOut && <span className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-gold-500 text-white shadow-md"><Check size={16} /></span>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[1.65rem] leading-tight">{room.name}</h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          <span className={spec}><Users size={15} className="text-gold-500" />Up to {room.maxGuests}</span>
          <span className={spec}><BedDouble size={15} className="text-gold-500" />{bedLabel(room.bedType)}</span>
          <span className={spec}><Maximize2 size={15} className="text-gold-500" />{room.size} sq ft</span>
        </div>
        <p className="mt-4 line-clamp-3 text-[0.95rem] leading-relaxed text-ink/80">{room.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink/10 pt-5">
          {user ? (
            <p><span className="font-serif text-3xl font-semibold">{inr(room.pricePerNight)}</span> <span className="text-xs text-ink/68">/ night</span></p>
          ) : (
            <Link to="/login" state={{ from }} className="flex items-center gap-1.5 text-sm text-gold-700 hover:underline"><Lock size={14} />Log in to see price</Link>
          )}
          {onSelect
            ? <button type="button" onClick={onSelect} disabled={soldOut} className={`${selected && !soldOut ? 'bt-gold' : 'bt-line'} bt-sm ${soldOut ? 'cursor-not-allowed opacity-60' : ''}`}>{soldOut ? 'Sold out' : selected ? 'Selected' : 'Select room'}</button>
            : <Link to={to} className="bt-dark bt-sm">Book room</Link>}
        </div>
      </div>
    </article>
  );
}
