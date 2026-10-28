import { useState } from 'react';
import { Star } from 'lucide-react';
import api, { errMsg } from '../api';

// Guests share a review. It is saved hidden and goes live after the admin switches on "Show on website".
export default function ReviewForm({ type = 'stay' }) {
  const food = type === 'food';
  const [f, setF] = useState({ name: '', country: '', rating: 5, text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/reviews/submit', { ...f, type });
      setDone(data.message || 'Thank you! Your review will appear after we check it.');
      setF({ name: '', country: '', rating: 5, text: '' });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="surface mx-auto max-w-2xl p-8 text-center">
      <p className="font-serif text-3xl">Thank you</p>
      <p className="mt-2 text-ink/80">{done}</p>
      <button type="button" className="bt-line bt-sm mt-5" onClick={() => setDone('')}>Write another</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="surface mx-auto max-w-2xl space-y-4 p-6 md:p-8">
      <h3 className="text-3xl">{food ? 'Tell us about the food' : 'Tell us about your stay'}</h3>
      <p className="text-sm text-ink/70">{food ? 'Loved a dish? Share it with other guests.' : 'Stayed with us? Share your experience.'} Reviews are shown after we check them.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="lbl">Your name</span><input className="inp" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label className="block"><span className="lbl">City / country (optional)</span><input className="inp" value={f.country} maxLength={80} onChange={(e) => setF({ ...f, country: e.target.value })} /></label>
      </div>
      <div>
        <span className="lbl">Your rating</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setF({ ...f, rating: n })} className="p-0.5 text-gold-500">
              <Star size={28} fill={n <= f.rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
      <label className="block"><span className="lbl">Your review</span><textarea className="inp" rows="4" maxLength={1500} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required minLength={10} /></label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button className="bt-gold" disabled={busy}>{busy ? 'Sending…' : 'Submit review'}</button>
    </form>
  );
}
