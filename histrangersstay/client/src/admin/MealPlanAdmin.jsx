import { useState } from 'react';
import api, { errMsg } from '../api';

const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Same defaults as the server, used only if an old hotel record has no meal plan saved yet
const FALLBACK = {
  enabled: true,
  options: [
    { key: 'bd', name: 'Breakfast + Dinner', includes: ['Breakfast', 'Dinner'], price: 300 },
    { key: 'bld', name: 'Breakfast + Lunch + Dinner', includes: ['Breakfast', 'Lunch', 'Dinner'], price: 400 },
  ],
  weekly: DAYS.map((day) => ({ day, breakfast: '', lunch: '', dinner: '' })),
};

const normalize = (mp) => {
  const m = mp && mp.options?.length ? mp : FALLBACK;
  const byDay = Object.fromEntries((m.weekly || []).map((d) => [d.day, d]));
  return {
    enabled: m.enabled !== false,
    options: m.options.map((o) => ({ ...o, price: o.price ?? 0, includes: [...(o.includes || [])] })),
    weekly: DAYS.map((day) => ({ day, breakfast: '', lunch: '', dinner: '', ...(byDay[day] || {}) })),
  };
};

/**
 * Admin > Rooms (the property page): two meal plan options + the weekly menu.
 * Price is per guest per day. The same weekly menu is shown for both plans on the Stay page.
 */
export default function MealPlanAdmin({ hotel }) {
  const [mp, setMp] = useState(() => normalize(hotel.mealPlan));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const setOpt = (i, patch) => setMp((m) => ({ ...m, options: m.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const toggleInc = (i, meal) => setMp((m) => ({
    ...m,
    options: m.options.map((o, j) => {
      if (j !== i) return o;
      const has = o.includes.includes(meal);
      const next = has ? o.includes.filter((x) => x !== meal) : [...o.includes, meal];
      return { ...o, includes: MEALS.filter((x) => next.includes(x)) };
    }),
  }));
  const setDay = (day, k, v) => setMp((m) => ({ ...m, weekly: m.weekly.map((d) => (d.day === day ? { ...d, [k]: v } : d)) }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (mp.options.some((o) => !o.name.trim() || o.price === '' || Number(o.price) < 0 || o.includes.length === 0)) {
      return setMsg({ err: true, text: 'Every plan needs a name, a price and at least one meal.' });
    }
    setBusy(true);
    try {
      const payload = {
        enabled: mp.enabled,
        options: mp.options.map((o) => ({ key: o.key, name: o.name.trim(), includes: o.includes, price: Number(o.price) })),
        weekly: mp.weekly,
      };
      await api.put(`/hotels/${hotel._id}`, { mealPlan: payload });
      setMsg({ text: 'Meal plans saved' });
    } catch (err) { setMsg({ err: true, text: errMsg(err) }); } finally { setBusy(false); }
  };

  return (
    <form className="form card" onSubmit={save} style={{ marginBottom: '2rem', padding: '1.4rem' }}>
      <h2 style={{ marginTop: 0 }}>Meal plans</h2>
      <p className="muted">Two plans guests can add while booking. Price is per guest, per day (days = nights stayed). The weekly menu below is shown for both plans.</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
        <input type="checkbox" checked={mp.enabled} onChange={(e) => setMp({ ...mp, enabled: e.target.checked })} style={{ width: 'auto' }} />
        Offer meal plans on the website
      </label>

      <div className="fgrid">
        {mp.options.map((o, i) => (
          <div key={o.key} style={{ border: '1px solid rgba(0,0,0,.12)', padding: '1rem', display: 'grid', gap: 10 }}>
            <h3 style={{ margin: 0 }}>Option {i + 1}</h3>
            <label>Plan name<input value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} required /></label>
            <label>Price per guest per day (INR)<input type="number" min="0" value={o.price} onChange={(e) => setOpt(i, { price: e.target.value })} required /></label>
            <div>
              <div className="muted" style={{ marginBottom: 4 }}>Meals included</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {MEALS.map((meal) => (
                  <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={o.includes.includes(meal)} onChange={() => toggleInc(i, meal)} style={{ width: 'auto' }} />{meal}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 6 }}>Weekly menu</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr></thead>
          <tbody>
            {mp.weekly.map((d) => (
              <tr key={d.day}>
                <td><b>{d.day}</b></td>
                {['breakfast', 'lunch', 'dinner'].map((k) => (
                  <td key={k}><input value={d[k]} onChange={(e) => setDay(d.day, k, e.target.value)} placeholder={k === 'lunch' ? 'Only in the plan with lunch' : ''} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`} style={{ marginLeft: 0 }}>{msg.text}</div>}
      <button className="btn btn--gold" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Saving…' : 'Save meal plans'}</button>
    </form>
  );
}
