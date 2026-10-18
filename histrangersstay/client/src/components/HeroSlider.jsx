import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import SmartImg from './SmartImg';

// Full-screen slider with cross-fade, slow zoom, arrows, dots and swipe. Pauses on hover.
export default function HeroSlider({ slides, eyebrow, hasVideo }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef(null);
  const n = slides.length;
  const go = useCallback((d) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [n, paused, go]);

  const cur = slides[i] || {};
  return (
    <section
      className="relative isolate flex h-[100svh] max-h-[980px] min-h-[640px] items-center overflow-hidden bg-ink text-white"
      aria-roledescription="carousel" aria-label="Highlights"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (startX.current == null) return; const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); startX.current = null; }}
    >
      {slides.map((s, idx) => (
        <div key={idx} aria-hidden={idx !== i} className={`absolute inset-0 -z-10 transition-opacity duration-[1400ms] ${idx === i ? 'opacity-100' : 'opacity-0'}`}>
          <SmartImg eager={idx === 0} src={s.img} alt="" className={`h-full w-full object-cover ${idx === i ? 'animate-kenburns' : ''}`} />
        </div>
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/65 via-black/25 to-black/75" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/50 to-transparent" />

      <div className="wrap pb-36 pt-32">
        <div key={i} className="max-w-3xl">
          {eyebrow && <p className="animate-fade-up text-[0.74rem] uppercase tracking-[0.4em] text-gold-300">{eyebrow}</p>}
          <h1 className="mt-5 animate-fade-up text-[2.9rem] leading-[1.02] [animation-delay:.1s] sm:text-6xl lg:text-[5.4rem]">{cur.title}</h1>
          {cur.sub && <p className="mt-6 max-w-xl animate-fade-up text-lg font-light leading-relaxed text-white/85 [animation-delay:.25s] md:text-xl">{cur.sub}</p>}
          <div className="mt-9 flex animate-fade-up flex-wrap gap-4 [animation-delay:.4s]">
            <Link to="/stay#book" className="bt-gold">Book your stay</Link>
            {hasVideo
              ? <a href="#video" className="bt-ghost"><Play size={15} />Watch video</a>
              : <Link to="/experiences" className="bt-ghost">Explore experiences</Link>}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="absolute inset-x-0 bottom-28 z-10 md:bottom-32">
          <div className="wrap flex items-center justify-between">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((_, idx) => (
                <button key={idx} role="tab" aria-selected={idx === i} aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === i ? 'w-12 bg-gold-400' : 'w-6 bg-white/40 hover:bg-white/70'}`} />
              ))}
              <span className="ml-3 text-xs tracking-widest text-white/78">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
            </div>
            <div className="hidden gap-2 md:flex">
              <button onClick={() => go(-1)} aria-label="Previous" className="grid h-12 w-12 place-items-center rounded-full border border-white/40 transition hover:bg-white hover:text-ink"><ChevronLeft size={20} /></button>
              <button onClick={() => go(1)} aria-label="Next" className="grid h-12 w-12 place-items-center rounded-full border border-white/40 transition hover:bg-white hover:text-ink"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
