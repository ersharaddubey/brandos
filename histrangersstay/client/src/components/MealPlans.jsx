import { Check, Utensils } from 'lucide-react';
import { inr } from '../api';

const SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];

/**
 * Two meal plan options + the weekly menu (same menu for both plans).
 * value = selected plan key ('' = no meal plan). Lunch is greyed out when the selected plan does not include it.
 * Price is per guest per day.
 */
export default function MealPlans({ plan, value, onChange, guests = 1, nights = 0 }) {
  if (!plan || plan.enabled === false || !(plan.options || []).length) return null;
  const selected = plan.options.find((o) => o.key === value);
  const hasMeal = (slot) => !selected || (selected.includes || []).includes(slot);
  const weekly = (plan.weekly || []).filter((d) => d.breakfast || d.lunch || d.dinner);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.options.map((o) => {
          const on = o.key === value;
          return (
            <button type="button" key={o.key} onClick={() => onChange(on ? '' : o.key)} aria-pressed={on}
              className={`surface relative p-6 text-left transition ${on ? 'ring-2 ring-gold-500' : 'hover:-translate-y-0.5'}`}>
              {on && <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-gold-500 text-white"><Check size={16} /></span>}
              <p className="eyebrow">{(o.includes || []).join(' · ')}</p>
              <h3 className="mt-2 text-2xl">{o.name}</h3>
              <p className="mt-3 font-serif text-4xl font-semibold">{inr(o.price)}<span className="ml-1 font-sans text-sm font-normal text-ink/70">per guest / day</span></p>
              {on && nights > 0 && <p className="mt-2 text-sm text-ink/75">{guests} {guests === 1 ? 'guest' : 'guests'} × {nights} {nights === 1 ? 'day' : 'days'} = <b>{inr(o.price * guests * nights)}</b> (before tax)</p>}
              <span className={`mt-4 inline-block text-sm font-medium ${on ? 'text-gold-700' : 'text-ink/70'}`}>{on ? 'Selected. Tap to remove' : 'Tap to select'}</span>
            </button>
          );
        })}
      </div>
      {!selected && <p className="mt-3 text-sm text-ink/70">Meal plan is optional. Without it you can still order from the food menu below.</p>}

      {weekly.length > 0 && (
        <div id="meal-menu" className="mt-8">
          <h3 className="flex items-center gap-2 text-2xl"><Utensils size={18} className="text-gold-700" />Weekly meal menu</h3>
          <p className="mt-1 text-sm text-ink/70">Same menu for both plans. Lunch is part of the {inr(plan.options.find((o) => (o.includes || []).includes('Lunch'))?.price || 0)} plan only.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white/40">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="bg-gold-50 text-xs uppercase tracking-widest text-ink/70">
                  <th className="px-4 py-3">Day</th>
                  {SLOTS.map(([k, label]) => <th key={k} className={`px-4 py-3 ${hasMeal(label) ? '' : 'opacity-40'}`}>{label}{!hasMeal(label) && ' (not in plan)'}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {weekly.map((d) => (
                  <tr key={d.day}>
                    <td className="px-4 py-3 font-medium">{d.day}</td>
                    {SLOTS.map(([k, label]) => <td key={k} className={`px-4 py-3 text-ink/85 ${hasMeal(label) ? '' : 'opacity-35 line-through'}`}>{d[k] || '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
