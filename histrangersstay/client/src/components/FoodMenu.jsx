import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Lock } from 'lucide-react';
import SmartImg from './SmartImg';
import { inr } from '../api';

export const VegDot = ({ veg }) => (
  <span title={veg ? 'Veg' : 'Non-veg'} className={`inline-grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2 ${veg ? 'border-emerald-600' : 'border-red-600'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
  </span>
);

// Food menu with quantity steppers. qty is a map { foodId: number }, onQty(id, n) updates it.
// canOrder=false (guest not logged in) shows the menu without prices and asks to log in.
export default function FoodMenu({ items = [], qty = {}, onQty, canOrder = true, from = '/stay' }) {
  const cats = useMemo(() => [...new Set(items.map((i) => i.category || 'Menu'))], [items]);
  const [cat, setCat] = useState('All');
  const shown = items.filter((i) => cat === 'All' || (i.category || 'Menu') === cat);

  if (!items.length) return <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/70">The food menu will appear here soon.</p>;

  return (
    <div>
      {cats.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {['All', ...cats].map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${cat === c ? 'border-gold-500 bg-gold-500 text-white' : 'border-ink/15 bg-white/50 text-ink/85 hover:border-gold-500'}`}>{c}</button>
          ))}
        </div>
      )}
      {!canOrder && (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-gold-50 px-4 py-3 text-sm text-ink/85">
          <Lock size={15} className="text-gold-700" />Log in to see prices and add food to your booking.
          <Link className="font-medium text-gold-700 hover:underline" to="/login" state={{ from }}>Log in</Link>
          <span>or</span>
          <Link className="font-medium text-gold-700 hover:underline" to="/register" state={{ from }}>Register</Link>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((f) => {
          const n = qty[f._id] || 0;
          return (
            <article key={f._id} className={`glass flex gap-4 rounded-2xl p-4 ${n ? 'ring-2 ring-gold-500/50' : ''}`}>
              {f.image && <SmartImg src={f.image} alt={f.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2"><VegDot veg={f.veg} /><h4 className="text-lg font-semibold leading-tight">{f.name}</h4></div>
                {f.description && <p className="mt-1 line-clamp-2 text-[0.85rem] text-ink/72">{f.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  {canOrder ? <span className="font-serif text-xl font-semibold">{inr(f.price)}</span> : <span className="text-xs text-ink/60">{f.category}</span>}
                  {canOrder && (n === 0 ? (
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
    </div>
  );
}
