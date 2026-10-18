import { Link } from 'react-router-dom';
import { Check, ArrowRight, MapPin, Star } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useProperty } from '../PropertyContext';
import { parseSlides, parseGallery, parseExperiences, parseEvents, parsePairs, parseNearby, parseFaqs, paras } from '../lib/parse';
import amenityIcon from '../components/amenityIcon';
import HeroSlider from '../components/HeroSlider';
import BookingBar from '../components/BookingBar';
import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';
import SmartImg from '../components/SmartImg';
import RoomCard from '../components/RoomCard';
import OfferCarousel from '../components/OfferCarousel';
import VideoSection from '../components/VideoSection';
import Gallery from '../components/Gallery';
import useGallery from '../lib/useGallery';
import useReviews from '../lib/useReviews';
import Testimonials from '../components/Testimonials';
import FaqList from '../components/FaqList';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';
import EventCard from '../components/EventCard';
import LongStayPricing from '../components/LongStayPricing';

export default function Home() {
  const { settings: s } = useSettings();
  const { hotel, rooms, offers, error } = useProperty();

  let slides = parseSlides(s.heroSlides);
  if (!slides.length) slides = [{ img: s.heroImage, title: s.siteName, sub: s.heroSubtitle || s.tagline }];
  const hasVideo = (s.youtubeUrls?.length || 0) + (s.instagramUrls?.length || 0) > 0;

  const { tiles } = useGallery();
  const photos = tiles.length ? tiles : [...parseGallery(s.gallery), ...(hotel?.images || []).map((src) => ({ src, caption: '' }))]
    .filter((p, i, a) => a.findIndex((x) => x.src === p.src) === i);
  const experiences = parseExperiences(s.experiences).slice(0, 4);
  const why = parsePairs(s.whyUs);
  const { reviews } = useReviews();
  const nearby = parseNearby(s.nearby).flatMap((g) => g.items.map((n) => ({ ...n, cat: g.title }))).slice(0, 6);
  const faqs = parseFaqs(s.faqs).slice(0, 5);
  const events = parseEvents(s.events).slice(0, 3);
  const story = paras(s.about);
  const trust = [
    ...(s.reviewScore > 0 ? [{ icon: Star, top: `${Number(s.reviewScore).toFixed(1)} / 10`, bottom: s.reviewLabel || 'Guest rating' }] : []),
    ...(s.highlights || []).slice(0, 4).map((h) => ({ icon: amenityIcon(h), top: h, bottom: '' })),
  ].slice(0, 4);

  return (
    <>
      <HeroSlider slides={slides} eyebrow={hotel ? `${hotel.city}, ${hotel.state || 'India'}` : s.tagline} hasVideo={hasVideo} />

      <div className="wrap relative z-20 -mt-28 md:-mt-24"><BookingBar /></div>
      {error && <p className="wrap mt-6 glass rounded-xl p-4 text-sm text-gold-800">Could not load rooms. Start the API server (<code>npm run dev:server</code>) and refresh.</p>}

      {/* Trust strip */}
      {trust.length > 0 && (
        <section className="wrap pt-14">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
            {trust.map((t, i) => (
              <Reveal key={i} delay={i * 80} className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><t.icon size={21} /></span>
                <span className="leading-tight"><b className="block text-[0.95rem] font-medium">{t.top}</b>{t.bottom && <span className="text-sm text-ink/70">{t.bottom}</span>}</span>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      <section className="wrap section-y">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <SmartImg src={s.welcomeImage || photos[0]?.src || s.heroImage} alt={s.siteName} className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-lift" />
            <SmartImg src={s.welcomeImage2 || photos[1]?.src} alt="" className="absolute -bottom-8 -right-4 hidden aspect-square w-2/5 rounded-[1.5rem] border-8 border-cream object-cover shadow-lift sm:block" />
            {s.reviewScore > 0 && (
              <div className="absolute -left-3 top-8 glass-strong rounded-2xl px-5 py-4">
                <p className="font-serif text-4xl font-semibold leading-none text-gold-700">{Number(s.reviewScore).toFixed(1)}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-ink/70">{s.reviewLabel}</p>
              </div>
            )}
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow">{s.welcomeEyebrow || 'Welcome'}</p>
            <h2 className="mt-3 text-4xl leading-[1.05] md:text-6xl">{s.welcomeTitle || `Welcome to ${s.siteName}`}</h2>
            <div className="copy mt-6">{story.slice(0, 2).map((t, i) => <p key={i}>{t}</p>)}</div>
            {s.highlights?.length > 0 && (
              <ul className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {s.highlights.slice(0, 6).map((h) => <li key={h} className="flex items-start gap-2.5 text-[0.95rem] text-ink/88"><Check size={18} className="mt-0.5 shrink-0 text-gold-700" />{h}</li>)}
              </ul>
            )}
            <div className="mt-9 flex flex-wrap gap-4"><Link to="/about" className="bt-dark">Our story</Link><Link to="/facilities" className="bt-line">All facilities</Link></div>
          </Reveal>
        </div>
      </section>

      {/* Rooms */}
      {rooms.length > 0 && (
        <section className="band section-y">
          <div className="wrap">
            <SectionHeading eyebrow="Stay" title="Choose your room" text="Private rooms with mountain views. Select your preferred space and reserve in minutes.">
            </SectionHeading>
            <div className="flex flex-wrap justify-center gap-7">
              {rooms.map((r, i) => <Reveal key={r._id} delay={i * 90} className="w-full md:w-[calc(50%-14px)] lg:w-[calc(33.333%-19px)]"><RoomCard room={r} to={`/stay?room=${r._id}#book`} from="/" /></Reveal>)}
            </div>
            <div className="mt-12 text-center"><Link to="/stay" className="bt-line">View all room details <ArrowRight size={16} /></Link></div>
          </div>
        </section>
      )}

      <LongStayPricing />

      {/* Experiences */}
      {experiences.length > 0 && (
        <section className="band-dark py-20 text-white md:py-28">
          <div className="wrap">
            <SectionHeading light eyebrow="Experiences" title="More than a place to sleep" text="Bike rides, forest trails, chai mornings and bonfire nights — the moments that stay with you long after you leave.">
            </SectionHeading>
            <div className="flex flex-wrap justify-center gap-5">
              {experiences.map((x, i) => (
                <Reveal key={x.title} delay={i * 90} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
                  <Link to="/experiences" className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-ink-700">
                    <SmartImg src={x.img} alt={x.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-6">
                      <b className="font-serif text-2xl font-medium">{x.title}</b>
                      <span className="mt-2 block max-h-0 overflow-hidden text-sm leading-relaxed text-white/88 transition-all duration-500 group-hover:max-h-32">{x.desc}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <VideoSection />

      {/* Offers */}
      {offers.length > 0 && (
        <section className="wrap section-y">
          <SectionHeading eyebrow="Offers" title="Book now, enjoy more" text="Copy a code, then add it when you reserve. Offers run for a limited time.">
          </SectionHeading>
          <OfferCarousel offers={offers} />
          <div className="mt-6 text-center"><Link to="/offers" className="text-sm font-medium uppercase tracking-[0.2em] text-gold-700 hover:underline">All offers</Link></div>
        </section>
      )}

      {/* Why book with us */}
      {why.length > 0 && (
        <section className="band py-20 md:py-24">
          <div className="wrap">
            <SectionHeading eyebrow="Why us" title="Why guests stay with us" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {why.map((w, i) => {
                const Icon = amenityIcon(`${w.title} ${w.desc}`);
                return (
                  <Reveal key={w.title} delay={i * 80} className="surface p-7 transition hover:-translate-y-1 hover:shadow-glass-lg">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Icon size={26} /></span>
                    <h3 className="mt-5 text-2xl">{w.title}</h3>
                    <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/78">{w.desc}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {photos.length >= 3 && (
        <section className="wrap section-y">
          <SectionHeading eyebrow="Gallery" title="A glimpse of the stay">
          </SectionHeading>
          <Reveal><Gallery items={photos} variant="mosaic" limit={Math.min(photos.length, 6)} /></Reveal>
          <div className="mt-10 text-center"><Link to="/gallery" className="bt-line">View all photos <ArrowRight size={16} /></Link></div>
        </section>
      )}

      {/* Reviews */}
      {(reviews.length > 0 || s.reviewScore > 0) && (
        <section className="band section-y">
          <div className="wrap">
            <SectionHeading eyebrow="Reviews" title="Loved by our guests" />
            <Testimonials reviews={reviews} score={s.reviewScore} label={s.reviewLabel} count={s.reviewCount} />
          </div>
        </section>
      )}

      {/* Around */}
      {nearby.length > 0 && (
        <section className="wrap section-y">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <p className="eyebrow">Location</p>
              <h2 className="mt-3 text-4xl leading-[1.05] md:text-5xl">Right where the valley begins</h2>
              <p className="copy mt-5">Cafes, waterfalls and the airport, all at an easy distance. Plan your days around the property.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/nearby" className="bt-dark">What is nearby</Link>
                {s.mapLink && <a href={s.mapLink} target="_blank" rel="noreferrer" className="bt-line"><MapPin size={16} />Open map</a>}
              </div>
            </Reveal>
            <Reveal delay={120} className="surface divide-y divide-ink/10 p-2">
              {nearby.map((n) => (
                <div key={n.name} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span><b className="font-medium">{n.name}</b><span className="block text-xs uppercase tracking-widest text-ink/60">{n.cat}</span></span>
                  <span className="shrink-0 rounded-full bg-white/55 border border-white/70 px-3.5 py-1 text-sm font-medium text-gold-800">{n.dist}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="band section-y">
          <div className="wrap max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions before you book" />
            <FaqList faqs={faqs} />
            <div className="mt-8 text-center"><Link to="/faq" className="text-sm font-medium uppercase tracking-[0.2em] text-gold-700 hover:underline">All questions and house rules</Link></div>
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="wrap section-y">
          <SectionHeading eyebrow="Events" title="Evenings worth staying for" text="Bonfires, live music and movie nights with fellow travellers. Ask the hosts what is on during your dates." />
          <div className="flex flex-wrap justify-center gap-7">
            {events.map((ev, i) => (
              <Reveal key={ev.title} delay={i * 90} className="w-full md:w-[calc(50%-14px)] lg:w-[calc(33.333%-19px)]">
                <EventCard ev={ev} />
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center"><Link to="/events" className="bt-line">All events <ArrowRight size={16} /></Link></div>
        </section>
      )}

      <div className="pt-20"><CustomBlocks page="home" /></div>
      <CtaBand />
    </>
  );
}
