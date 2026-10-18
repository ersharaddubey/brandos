import { Link } from 'react-router-dom';
import { Star, Quote } from 'lucide-react';
import DiaryReviews from './DiaryReviews';

export const Stars = ({ n = 5, size = 16 }) => (
  <span className="flex gap-0.5 text-gold-500">{Array.from({ length: n }, (_, i) => <Star key={i} size={size} fill="currentColor" />)}</span>
);

export function ReviewCard({ r, className = '' }) {
  return (
    <figure className={`tilt glass flex flex-col rounded-3xl p-8 ${className}`}>
      <Quote size={30} className="text-gold-300" />
      <blockquote className="mt-4 flex-1 text-[1.02rem] leading-relaxed text-ink/88">{r.text}</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/50 border border-white/70 font-serif text-lg font-semibold text-gold-700">{(r.name || '?')[0]}</span>
        <span><b className="block">{r.name}</b>{r.country && <span className="text-sm text-ink/68">{r.country}</span>}</span>
        <span className="ml-auto"><Stars size={14} /></span>
      </figcaption>
    </figure>
  );
}

// Home page: score summary + a few diary pages (full diary on /reviews)
export default function Testimonials({ reviews, score, label, count }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[320px_1fr]">
      <div className="text-center lg:sticky lg:top-28 lg:text-left">
        <p className="font-serif text-8xl font-medium leading-none text-gold-700">{Number(score || 0).toFixed(1)}</p>
        <div className="mt-3 flex justify-center lg:justify-start"><Stars size={20} /></div>
        <p className="mt-3 font-serif text-3xl">{label || 'Guest reviews'}</p>
        <p className="text-sm text-ink/70">Based on {count || reviews.length} guest reviews</p>
        <Link to="/reviews" className="bt-line bt-sm mt-6">Read the full diary</Link>
      </div>
      <div className="min-w-0">
        <DiaryReviews reviews={reviews} perPage={3} title="Guest diary" twoCol={false} />
      </div>
    </div>
  );
}
