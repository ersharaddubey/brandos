import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../SettingsContext';
import { parseScores } from '../lib/parse';
import useReviews from '../lib/useReviews';
import PageHero from '../components/PageHero';
import { Stars } from '../components/Testimonials';
import DiaryReviews from '../components/DiaryReviews';
import ReviewForm from '../components/ReviewForm';
import Reveal from '../components/Reveal';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

const TABS = [['stay', 'Stay reviews'], ['food', 'Food & cafe reviews']];

// Stay and food reviews live in two separate sections: /reviews and /reviews?tab=food
function StaySummary({ s, reviews, scores }) {
  const mapUrl = s.mapLink || '';
  return (
    <Reveal className="surface mb-10 grid items-center gap-8 p-6 sm:p-8 md:mb-14 md:grid-cols-[260px_1fr] md:gap-12">
      <div className="text-center">
        <p className="text-center font-serif text-7xl leading-none text-gold-700 sm:text-8xl">{Number(s.reviewScore || 0).toFixed(1)}</p>
        <div className="mt-3 flex justify-center"><Stars size={20} /></div>
        <p className="mt-3 text-center font-serif text-3xl">{s.reviewLabel || 'Reviews'}</p>
        <p className="text-center text-sm text-ink/70">{s.reviewCount || reviews.length || 0} guest reviews</p>
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 block text-center text-sm font-medium uppercase tracking-[0.18em] text-gold-700 hover:underline">
            See all on Google
          </a>
        )}
      </div>
      {scores.length > 0 && (
        <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {scores.map((x) => (
            <div key={x.label}>
              <div className="mb-1.5 flex justify-between text-sm"><span className="text-ink/85">{x.label}</span><b>{x.value}</b></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600" style={{ width: `${Math.min(100, x.value * 10)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Reveal>
  );
}

// Food has no Google score, so the summary is worked out from the food reviews themselves
function FoodSummary({ reviews }) {
  const n = reviews.length;
  const avg = n ? reviews.reduce((t, r) => t + (r.rating || 0), 0) / n : 0;
  return (
    <Reveal className="surface mb-10 grid items-center gap-8 p-6 sm:p-8 md:mb-14 md:grid-cols-[260px_1fr] md:gap-12">
      <div className="text-center">
        <p className="text-center font-serif text-7xl leading-none text-gold-700 sm:text-8xl">{avg.toFixed(1)}</p>
        <div className="mt-3 flex justify-center"><Stars n={Math.round(avg) || 5} size={20} /></div>
        <p className="mt-3 text-center font-serif text-3xl">Food rating</p>
        <p className="text-center text-sm text-ink/70">{n} food {n === 1 ? 'review' : 'reviews'} out of 5</p>
      </div>
      <div className="space-y-2.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const c = reviews.filter((r) => Math.round(r.rating) === star).length;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0 text-ink/80">{star} star</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/50"><div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600" style={{ width: `${n ? (c / n) * 100 : 0}%` }} /></div>
              <b className="w-6 text-right">{c}</b>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

export default function Reviews() {
  const { settings: s } = useSettings();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'food' ? 'food' : 'stay';
  const scores = parseScores(s.reviewCategories);
  const { reviews, loading } = useReviews(tab);

  const switchTab = (t) => setParams(t === 'stay' ? {} : { tab: t }, { replace: true });

  return (
    <>
      <PageHero eyebrow="Reviews" title="What guests say" text="Pages from our guest diary. Read about the stay and about the food, each in its own section." />

      <section className="wrap section-y pb-10">
        <div className="mx-auto mb-12 flex max-w-xl rounded-full border border-ink/15 bg-white/60 p-1.5" role="tablist" aria-label="Review sections">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => switchTab(key)}
              className={`flex-1 rounded-full px-2 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.08em] transition sm:px-4 sm:text-sm sm:tracking-[0.12em] ${tab === key ? 'bg-ink text-white shadow' : 'text-ink/80 hover:bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'stay'
          ? <StaySummary s={s} reviews={reviews} scores={scores} />
          : !loading && reviews.length > 0 && <FoodSummary reviews={reviews} />}

        {loading ? (
          <p className="hand text-center text-3xl text-ink/60">Opening the diary…</p>
        ) : (
          <Reveal className="mx-auto max-w-6xl">
            <DiaryReviews key={tab} reviews={reviews} perPage={10} title={tab === 'food' ? 'Food diary' : 'Guest diary'} twoCol />
          </Reveal>
        )}

        <div className="mt-16"><ReviewForm key={tab} type={tab} /></div>
      </section>

      {tab === 'stay' && <CustomBlocks page="reviews" />}
      <CtaBand />
    </>
  );
}
