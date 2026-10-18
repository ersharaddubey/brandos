import { Link } from 'react-router-dom';
import { Check, Instagram } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useProperty } from '../PropertyContext';
import { igUrl } from '../config';
import { paras, parsePairs } from '../lib/parse';
import amenityIcon from '../components/amenityIcon';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import SmartImg from '../components/SmartImg';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

export default function About() {
  const { settings: s } = useSettings();
  const { hotel, rooms } = useProperty();
  const why = parsePairs(s.whyUs);
  const stats = [
    s.reviewScore > 0 && [Number(s.reviewScore).toFixed(1), 'Guest rating'],
    rooms.length > 0 && [rooms.length, 'Room types'],
    s.reviewCount > 0 && [s.reviewCount, 'Guest reviews'],
    ['Free', 'Wi-Fi and parking'],
  ].filter(Boolean);
  return (
    <>
      <PageHero eyebrow="About" title={`About ${s.siteName}`} text={s.tagline} />
      <section className="wrap section-y">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal className="copy">
            {paras(s.about).map((t, i) => <p key={i} className={i === 0 ? 'font-serif text-2xl leading-snug text-ink' : ''}>{t}</p>)}
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/stay#book" className="bt-gold">Book your stay</Link>
              {s.instagram && <a className="bt-line" href={igUrl(s.instagram)} target="_blank" rel="noreferrer"><Instagram size={16} />Instagram</a>}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <SmartImg src={hotel?.images?.[0] || s.heroImage} alt={s.siteName} className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift" />
            {s.highlights?.length > 0 && (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">{s.highlights.map((h) => <li key={h} className="flex items-start gap-2.5 text-ink/88"><Check size={18} className="mt-0.5 shrink-0 text-gold-700" />{h}</li>)}</ul>
            )}
          </Reveal>
        </div>
      </section>

      <section className="band-dark py-16 text-white">
        <div className="wrap grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {stats.map(([v, l]) => <div key={l}><p className="font-serif text-6xl text-gold-400">{v}</p><p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/78">{l}</p></div>)}
        </div>
      </section>

      {why.length > 0 && (
        <section className="wrap section-y">
          <h2 className="mb-12 text-center text-4xl md:text-5xl">What makes us different</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {why.map((w, i) => { const Icon = amenityIcon(`${w.title} ${w.desc}`); return (
              <Reveal key={w.title} delay={i * 70} className="surface flex gap-5 p-7"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Icon size={26} /></span><div><h3 className="text-2xl">{w.title}</h3><p className="mt-1 text-ink/78">{w.desc}</p></div></Reveal>
            ); })}
          </div>
        </section>
      )}
      <CustomBlocks page="about" />
      <CtaBand />
    </>
  );
}
