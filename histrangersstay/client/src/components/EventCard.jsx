import { Link } from 'react-router-dom';
import { CalendarDays, ArrowRight } from 'lucide-react';
import SmartImg from './SmartImg';

// One event tile, used on the home page and the Events page
export default function EventCard({ ev, className = '' }) {
  return (
    <article className={`tilt group surface flex h-full flex-col overflow-hidden transition hover:shadow-glass-lg ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        <SmartImg src={ev.img} alt={ev.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {ev.when && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/70 px-3.5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-gold-800 shadow-soft">
            <CalendarDays size={13} />{ev.when}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-7">
        <h3 className="text-3xl">{ev.title}</h3>
        {ev.desc && <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink/78">{ev.desc}</p>}
        <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-gold-700 hover:text-gold-700">
          Ask about it <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
