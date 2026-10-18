import { MapPin, Navigation } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { parseNearby } from '../lib/parse';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import CtaBand from '../components/CtaBand';

export default function Nearby() {
  const { settings: s } = useSettings();
  const groups = parseNearby(s.nearby);
  return (
    <>
      <PageHero eyebrow="Around the stay" title="What is nearby" text="Cafes, waterfalls and the airport. Distances are approximate.">
        {s.mapLink && <a href={s.mapLink} target="_blank" rel="noreferrer" className="bt-white"><Navigation size={16} />Open in Google Maps</a>}
      </PageHero>
      <section className="wrap section-y">
        {groups.length === 0 ? <p className="text-center text-ink/70">Nearby places will appear once added in Admin → Site settings.</p> : (
          <div className="grid gap-6 md:grid-cols-2">
            {groups.map((g, i) => (
              <Reveal key={g.title} delay={(i % 2) * 90} className="surface p-8">
                <h3 className="flex items-center gap-3 text-3xl"><MapPin size={24} className="text-gold-700" />{g.title}</h3>
                <ul className="mt-5 divide-y divide-ink/10">{g.items.map((n) => <li key={n.name} className="flex items-center justify-between gap-4 py-3.5"><span>{n.name}</span><b className="shrink-0 rounded-full bg-white/55 border border-white/70 px-3.5 py-1 text-sm font-medium text-gold-800">{n.dist}</b></li>)}</ul>
              </Reveal>
            ))}
          </div>
        )}
      </section>
      <CtaBand />
    </>
  );
}
