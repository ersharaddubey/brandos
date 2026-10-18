import { Link } from 'react-router-dom';
import { MessageCircle, Flame, Music, Film, Bike } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';
import { parseEvents, parseGallery } from '../lib/parse';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import EventCard from '../components/EventCard';
import Reveal from '../components/Reveal';
import Gallery from '../components/Gallery';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

const VIBES = [
  [Flame, 'Bonfire nights', 'Warm evenings and shared stories'],
  [Music, 'Live music', 'Acoustic sessions in the lounge'],
  [Film, 'Movie nights', 'Chai, blankets and a good film'],
  [Bike, 'Rides and treks', 'Spontaneous trips around the valley'],
];

export default function Events() {
  const { settings: s } = useSettings();
  const events = parseEvents(s.events);
  const photos = parseGallery(s.gallery);
  const text = `Hi ${s.siteName}, I'd like to know about the upcoming events and evenings at the stay.`;

  return (
    <>
      <PageHero eyebrow="Events" title="Evenings worth staying for" text="Bonfires, music, movie nights and rides. Join the group or keep it quiet, the choice is yours." />

      {/* Highlights strip */}
      <section className="wrap pt-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
          {VIBES.map(([Icon, top, bottom], i) => (
            <Reveal key={top} delay={i * 80} className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Icon size={21} /></span>
              <span className="leading-tight"><b className="block text-[0.95rem] font-medium">{top}</b><span className="text-sm text-ink/70">{bottom}</span></span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="wrap section-y">
        <SectionHeading eyebrow="What's on" title="Events at the stay" text="Plans change with the weather and the crowd, so message the hosts to confirm what is happening during your dates." />
        {events.length === 0 ? (
          <p className="text-center text-ink/70">Events will be added soon. Message us to know what is planned.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-7">
            {events.map((ev, i) => (
              <Reveal key={ev.title} delay={(i % 3) * 90} className="w-full md:w-[calc(50%-14px)] lg:w-[calc(33.333%-19px)]">
                <EventCard ev={ev} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Photos */}
      {photos.length >= 3 && (
        <section className="band section-y">
          <div className="wrap">
            <SectionHeading eyebrow="Moments" title="A glimpse of the vibe" />
            <Reveal><Gallery items={photos} variant="mosaic" limit={Math.min(photos.length, 6)} /></Reveal>
            <div className="mt-10 text-center"><Link to="/gallery" className="bt-line">View all photos</Link></div>
          </div>
        </section>
      )}

      {/* House rule note + enquiry */}
      <section className="wrap section-y">
        <Reveal className="surface mx-auto max-w-4xl p-8 text-center md:p-14">
          <p className="eyebrow">Good to know</p>
          <h2 className="mt-3 text-4xl md:text-5xl">Friendly evenings, not parties</h2>
          <p className="copy mx-auto mt-5 max-w-2xl">
            Our evenings are relaxed get-togethers for guests staying with us. Private parties, hen or stag groups and large events are not accommodated, in line with our house rules.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {s.whatsapp && <a href={`${waUrl(s.whatsapp)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="bt-gold"><MessageCircle size={16} />Ask on WhatsApp</a>}
            <Link to="/contact" className="bt-line">Contact us</Link>
          </div>
        </Reveal>
      </section>

      <CustomBlocks page="events" />
      <CtaBand title="Come for the stay, stay for the evenings" />
    </>
  );
}
