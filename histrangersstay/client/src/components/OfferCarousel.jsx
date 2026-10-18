import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Check, Clock, Tag } from 'lucide-react';
import SmartImg from './SmartImg';
import { daysLeft } from '../lib/parse';
import { fmtDate } from '../api';

export function OfferCard({ o, className = '' }) {
  const [copied, setCopied] = useState(false);
  const left = daysLeft(o.validTill);
  const copy = () => { navigator.clipboard?.writeText(o.code); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <article className={`tilt group flex flex-col overflow-hidden glass rounded-3xl transition duration-500 hover:shadow-glass-lg ${className}`}>
      <div className="relative h-52 overflow-hidden">
        <SmartImg src={o.image} alt={o.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {o.tag && <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/70 px-3.5 py-1.5 text-[0.66rem] font-medium uppercase tracking-[0.18em] text-gold-700"><Tag size={12} />{o.tag}</span>}
        {o.discountPercent > 0 && <span className="absolute bottom-4 right-4 rounded-2xl bg-gold-500 px-4 py-2 font-serif text-2xl font-semibold text-white shadow-gold">{o.discountPercent}% off</span>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[1.6rem] leading-tight">{o.title}</h3>
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-ink/80">{o.description}</p>
        {o.validTill && (
          <p className="mt-4 flex items-center gap-2 text-sm text-ink/70"><Clock size={15} className="text-gold-500" />
            {left !== null && left <= 14 && left >= 0 ? <b className="text-gold-700">Ends in {left} {left === 1 ? 'day' : 'days'}</b> : `Valid till ${fmtDate(o.validTill)}`}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          {o.code && (
            <button onClick={copy} className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gold-500/70 px-4 py-2.5 font-mono text-sm tracking-[0.2em] text-gold-700 transition hover:bg-gold-50" aria-label={`Copy code ${o.code}`}>
              {o.code}{copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          )}
          <Link to={`/stay?${o.code ? `offer=${o.code}` : ''}#book`} className="bt-dark bt-sm ml-auto">Use offer</Link>
        </div>
      </div>
    </article>
  );
}

export default function OfferCarousel({ offers }) {
  const rail = useRef(null);
  const scroll = (d) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={rail} className={`no-scrollbar -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 ${offers.length < 3 ? 'lg:justify-center' : ''}`}>
        {offers.map((o) => <OfferCard key={o._id} o={o} className="w-[85%] shrink-0 snap-start sm:w-[400px]" />)}
      </div>
      {offers.length > 2 && (
        <div className="mt-2 hidden justify-end gap-2 lg:flex">
          <button onClick={() => scroll(-1)} aria-label="Previous offers" className="grid h-12 w-12 place-items-center rounded-full glass transition hover:bg-ink/80 hover:text-white"><ChevronLeft size={20} /></button>
          <button onClick={() => scroll(1)} aria-label="Next offers" className="grid h-12 w-12 place-items-center rounded-full glass transition hover:bg-ink/80 hover:text-white"><ChevronRight size={20} /></button>
        </div>
      )}
    </div>
  );
}
