import { useCallback, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import SmartImg from './SmartImg';
import { MOSAIC, SPAN, sizeOf } from '../lib/gallerySize';

function Lightbox({ items, index, onClose, onMove }) {
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onMove(1); if (e.key === 'ArrowLeft') onMove(-1); };
    window.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  }, [onClose, onMove]);
  const it = items[index];
  const btn = 'absolute grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25';
  return (
    <div className="fixed inset-0 z-[70] flex animate-fade-in flex-col items-center justify-center bg-black/95 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Close" className={`${btn} right-5 top-5`}><X size={22} /></button>
      <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} aria-label="Previous" className={`${btn} left-3 md:left-6`}><ChevronLeft size={24} /></button>
      <button onClick={(e) => { e.stopPropagation(); onMove(1); }} aria-label="Next" className={`${btn} right-3 md:right-6`}><ChevronRight size={24} /></button>
      <img src={it.src} alt={it.caption || ''} className="max-h-[82vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      <p className="mt-4 text-sm text-white/85">{it.caption} <span className="ml-2 text-white/40">{index + 1} / {items.length}</span></p>
    </div>
  );
}

// variant "mosaic" = home page strip, "masonry" = simple columns, "mixed" = gallery page (photos in different sizes)
export default function Gallery({ items, variant = 'masonry', limit }) {
  const [open, setOpen] = useState(-1);
  const list = limit ? items.slice(0, limit) : items;
  const move = useCallback((d) => setOpen((v) => (v + d + items.length) % items.length), [items.length]);
  const close = useCallback(() => setOpen(-1), []);

  const tile = (it, k, cls) => (
    <button key={it.src + k} onClick={() => setOpen(k)} className={`${variant === 'mixed' ? 'tilt ' : ''}group relative overflow-hidden rounded-2xl bg-ink/20 ${cls}`} aria-label={it.caption || `Photo ${k + 1}`}>
      <SmartImg src={it.thumb || it.src} alt={it.caption} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
      <Expand size={22} className="absolute right-4 top-4 text-white opacity-0 transition group-hover:opacity-100" />
      {it.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">{it.caption}</span>}
    </button>
  );

  return (
    <>
      {variant === 'mixed' ? (
        <div className={MOSAIC}>
          {list.map((it, k) => tile(it, k, `h-full w-full ${SPAN[sizeOf(it.size, k)]}`))}
        </div>
      ) : variant === 'mosaic' ? (
        <div className="grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4 md:gap-4">
          {list.map((it, k) => tile(it, k, k === 0 ? 'col-span-2 row-span-2' : k === 3 ? 'md:col-span-2' : ''))}
        </div>
      ) : (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {list.map((it, k) => tile(it, k, `block w-full break-inside-avoid ${k % 3 === 0 ? 'aspect-[4/5]' : k % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`))}
        </div>
      )}
      {open >= 0 && <Lightbox items={items} index={open} onClose={close} onMove={move} />}
    </>
  );
}
