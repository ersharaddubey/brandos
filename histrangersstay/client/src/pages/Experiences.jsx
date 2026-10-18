import { Link } from 'react-router-dom';
import { useSettings } from '../SettingsContext';
import { parseExperiences } from '../lib/parse';
import amenityIcon from '../components/amenityIcon';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';
import SmartImg from '../components/SmartImg';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

export default function Experiences() {
  const { settings: s } = useSettings();
  const list = parseExperiences(s.experiences);
  return (
    <>
      <PageHero eyebrow="Experiences" title="Make the stay unforgettable" text="Rides, trails, chai mornings and bonfire nights, hosted by people who know the valley." />

      {list.length > 0 && (
        <section className="wrap section-y space-y-16 md:space-y-24">
          {list.map((x, i) => (
            <Reveal key={x.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
              <SmartImg src={x.img} alt={x.title} className={`aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift ${i % 2 ? 'md:order-2' : ''}`} />
              <div>
                <p className="eyebrow">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="mt-3 text-4xl md:text-5xl">{x.title}</h2>
                <p className="copy mt-5">{x.desc}</p>
                <Link to="/contact" className="bt-line bt-sm mt-7">Ask the hosts</Link>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      {(s.breakfast?.length > 0 || s.activities?.length > 0) && (
        <section className="band section-y">
          <div className="wrap grid gap-8 md:grid-cols-2">
            {s.breakfast?.length > 0 && (
              <Reveal className="surface p-8 md:p-10">
                <h3 className="text-3xl">Breakfast options</h3>
                <div className="mt-6 flex flex-wrap gap-2.5">{s.breakfast.map((b) => <span key={b} className="pill">{b}</span>)}</div>
              </Reveal>
            )}
            {s.activities?.length > 0 && (
              <Reveal delay={100} className="surface p-8 md:p-10">
                <h3 className="text-3xl">Things to do</h3>
                <div className="mt-6 flex flex-wrap gap-2.5">{s.activities.map((a) => { const Icon = amenityIcon(a); return <span key={a} className="pill flex items-center gap-2"><Icon size={14} className="text-gold-700" />{a}</span>; })}</div>
              </Reveal>
            )}
          </div>
        </section>
      )}
      <div className="pt-20"><CustomBlocks page="experiences" /></div>
      <CtaBand title="Plan your days with us" />
    </>
  );
}
