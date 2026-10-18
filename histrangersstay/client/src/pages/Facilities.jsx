import { Check } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { parseGroups } from '../lib/parse';
import amenityIcon from '../components/amenityIcon';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import CtaBand from '../components/CtaBand';

export default function Facilities() {
  const { settings: s } = useSettings();
  const groups = parseGroups(s.facilityGroups);
  return (
    <>
      <PageHero eyebrow="Facilities" title="Everything you need" text="What is available at the property, room by room." />
      <section className="wrap section-y">
        {groups.length === 0 ? <p className="text-center text-ink/70">Facilities will appear once added in Admin → Site settings.</p> : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => { const Icon = amenityIcon(g.title); return (
              <Reveal key={g.title} delay={(i % 3) * 80} className="surface p-7">
                <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Icon size={22} /></span><h3 className="text-2xl">{g.title}</h3></div>
                <ul className="mt-5 space-y-2.5">{g.items.map((it) => <li key={it} className="flex items-start gap-2.5 text-[0.95rem] text-ink/85"><Check size={16} className="mt-1 shrink-0 text-gold-700" />{it}</li>)}</ul>
              </Reveal>
            ); })}
          </div>
        )}
      </section>
      <CtaBand />
    </>
  );
}
