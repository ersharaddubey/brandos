import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, X } from 'lucide-react';
import SmartImg from './SmartImg';
import { inr } from '../api';

export const VegDot = ({ veg }) => (
  <span title={veg ? 'Veg' : 'Non-veg'} className={`inline-grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2 ${veg ? 'border-emerald-600' : 'border-red-600'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
  </span>
);

const DIETS = [
  ['all', 'All'],
  ['veg', 'Veg'],
  ['nonveg', 'Non-veg'],
];

/**
 * Food menu. Prices and details are always visible, no login needed.
 *  - search box, Veg / Non-veg filter
 *  - the section bar works like tabs: tapping a section (Breakfast, Snacks...) shows ONLY that section's dishes, the rest stay hidden.
 *    Searching shows every matching dish (grouped by section) until the search box is cleared.
 *  - canOrder: show Add / quantity buttons (qty is a map { foodId: number }, onQty(id, n) updates it).
 *    canOrder=false gives a read-only menu.
 *  - stickyClass: where the sticky bar sticks (below the site header by default; use "top-0" inside a modal)
 *  - focusCat: scroll to this section once the menu has loaded (used by /cafe?cat=Breakfast)
 */
export default function FoodMenu({ items = [], qty = {}, onQty, canOrder = true, stickyClass = 'top-[92px]', focusCat = '' }) {
  const [q, setQ] = useState('');
  const [diet, setDiet] = useState('all');
  const [activeCat, setActiveCat] = useState('');
  const sectionRefs = useRef({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (diet === 'veg' && !i.veg) return false;
      if (diet === 'nonveg' && i.veg) return false;
      if (!needle) return true;
      return `${i.name} ${i.description || ''} ${i.category || ''}`.toLowerCase().includes(needle);
    });
  }, [items, q, diet]);

  // Sections in the order the dishes arrive (server sorts by category, then sort order)
  const sections = useMemo(() => {
    const map = new Map();
    filtered.forEach((i) => {
      const c = i.category || 'Menu';
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(i);
    });
    return [...map.entries()].map(([name, list]) => ({ name, list }));
  }, [filtered]);

  const counts = useMemo(() => ({
    all: items.length,
    veg: items.filter((i) => i.veg).length,
    nonveg: items.filter((i) => !i.veg).length,
  }), [items]);

  // Tabs: one section is shown at a time (the first one until the guest picks another). Searching shows all matches.
  const searching = q.trim() !== '';
  const current = sections.find((x) => x.name === activeCat)?.name || sections[0]?.name || '';
  const shown = searching ? sections : sections.filter((x) => x.name === current);

  const jump = (name) => {
    setQ('');
    setActiveCat(name);
    setTimeout(() => sectionRefs.current[name]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Open the page already scrolled to one section (/cafe?cat=Breakfast)
  useEffect(() => {
    if (!focusCat || !items.length) return undefined;
    const t = setTimeout(() => jump(focusCat), 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCat, items.length]);

  if (!items.length) return <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/70">The food menu will appear here soon.</p>;

  const clear = () => { setQ(''); setDiet('all'); };

  return (
    <div>
      {/* Search, diet filter and section bar. Stays visible while scrolling the menu. */}
      <div className={`sticky ${stickyClass} z-30 mb-6 rounded-2xl border border-white/70 bg-cream/95 px-2.5 py-2.5 shadow-soft backdrop-blur-xl sm:-mx-2 sm:mb-8 sm:px-3 sm:py-3`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="relative block flex-1">
            <span className="sr-only">Search the menu</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-ink/50" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes"
              className="inp !min-w-0 !rounded-full !py-2.5 !pl-10 !pr-9 sm:!pl-11"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink/60 hover:bg-ink/10">
                <X size={15} />
              </button>
            )}
          </label>
          <div className="flex shrink-0 rounded-full border border-ink/15 bg-white/60 p-0.5 sm:p-1" role="group" aria-label="Veg or non-veg">
            {DIETS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDiet(key)}
                aria-pressed={diet === key}
                className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition sm:gap-1.5 sm:px-3.5 sm:text-sm ${diet === key ? 'bg-ink text-white shadow' : 'text-ink/80 hover:bg-white'}`}
              >
                {key === 'veg' && <VegDot veg />}
                {key === 'nonveg' && <VegDot veg={false} />}
                {label}
                <span className={`hidden text-xs sm:inline ${diet === key ? 'text-white/70' : 'text-ink/50'}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        {sections.length > 1 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 sm:mt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="navigation" aria-label="Menu sections">
            {sections.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => jump(s.name)}
                className={`shrink-0 rounded-full border px-3.5 py-1 text-sm transition sm:px-4 sm:py-1.5 ${!searching && current === s.name ? 'border-gold-500 bg-gold-500 text-white' : 'border-ink/15 bg-white/60 text-ink/85 hover:border-gold-500'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 p-10 text-center">
          <p className="text-lg text-ink/80">No dishes match your search.</p>
          <button type="button" className="bt-line bt-sm mt-4" onClick={clear}>Clear search and filters</button>
        </div>
      ) : (
        <div className="space-y-12">
          {shown.map((s) => {
            const added = s.list.reduce((t, f) => t + (qty[f._id] || 0), 0);
            return (
            <section key={s.name} ref={(el) => { sectionRefs.current[s.name] = el; }} className="scroll-mt-48 sm:scroll-mt-56">
              <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-1 border-b-2 border-gold-500/50 pb-3">
                <h3 className="font-serif text-3xl font-semibold leading-none text-ink sm:text-4xl">{s.name}</h3>
                <span className="mb-1 text-sm text-ink/60">{s.list.length} {s.list.length === 1 ? 'dish' : 'dishes'}</span>
                {added > 0 && <span className="mb-1 rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-medium text-white">{added} added</span>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {s.list.map((f) => {
                  const n = qty[f._id] || 0;
                  return (
                    <article key={f._id} className={`glass flex gap-3 rounded-2xl p-3.5 sm:gap-4 sm:p-4 ${n ? 'ring-2 ring-gold-500/50' : ''}`}>
                      {f.image && <SmartImg src={f.image} alt={f.name} className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" />}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start gap-2"><VegDot veg={f.veg} /><h4 className="text-[1.05rem] font-semibold leading-tight sm:text-lg">{f.name}</h4></div>
                        {f.description && <p className="mt-1 text-[0.88rem] leading-snug text-ink/75">{f.description}</p>}
                        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                          <span>
                            <span className="font-serif text-xl font-semibold">{inr(f.price)}</span>
                            <span className="ml-2 text-[0.7rem] uppercase tracking-wider text-ink/50">{f.veg ? 'Veg' : 'Non-veg'}</span>
                          </span>
                          {canOrder && onQty && (n === 0 ? (
                            <button type="button" className="bt-line bt-sm" onClick={() => onQty(f._id, 1)}>Add</button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-full bg-gold-500 px-1.5 py-1 text-white">
                              <button type="button" aria-label={`Remove one ${f.name}`} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/20" onClick={() => onQty(f._id, n - 1)}><Minus size={15} /></button>
                              <b className="min-w-[1.2rem] text-center text-sm">{n}</b>
                              <button type="button" aria-label={`Add one more ${f.name}`} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/20" onClick={() => onQty(f._id, Math.min(20, n + 1))}><Plus size={15} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
