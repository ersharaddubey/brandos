import { useSettings } from '../SettingsContext';
import { parseScores } from '../lib/parse';
import useReviews from '../lib/useReviews';
import PageHero from '../components/PageHero';
import { Stars } from '../components/Testimonials';
import DiaryReviews from '../components/DiaryReviews';
import Reveal from '../components/Reveal';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

export default function Reviews() {
  const { settings: s } = useSettings();
  const scores = parseScores(s.reviewCategories);
  const { reviews, loading } = useReviews();
  const mapUrl = s.mapLink || '';

  return (
    <>
      <PageHero eyebrow="Reviews" title="What guests say" text="Pages from our guest diary, written by people who stayed with us." />

      <section className="wrap section-y pb-10">
        <Reveal className="surface mb-14 grid items-center gap-8 p-8 md:grid-cols-[260px_1fr] md:gap-12">
          <div className="text-center">
            <p className="text-center font-serif text-8xl leading-none text-gold-700">{Number(s.reviewScore || 0).toFixed(1)}</p>
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

        {loading ? (
          <p className="hand text-center text-3xl text-ink/60">Opening the diary…</p>
        ) : (
          <Reveal className="mx-auto max-w-6xl">
            <DiaryReviews reviews={reviews} perPage={10} title="Guest diary" twoCol />
          </Reveal>
        )}
      </section>

      <CustomBlocks page="reviews" />
      <CtaBand />
    </>
  );
}
