import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, Phone, Mail, MessageCircle, Instagram, Send, Navigation, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { igUrl, waUrl, mapEmbed, directionsUrl, PLACE } from '../config';
import { isoDay, paras } from '../lib/parse';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';
import LocationCards from '../components/LocationCards';

export default function Contact() {
  const { settings: s } = useSettings();
  const { hash } = useLocation();
  const [hasPlaces, setHasPlaces] = useState(false);
  // /contact#locations: scroll to the locations once they have loaded (the page grows while they load)
  const onPlaces = (rows) => {
    setHasPlaces(rows.length > 0);
    if (hash === '#locations' && rows.length) setTimeout(() => document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };
  const [f, setF] = useState({ name: '', checkIn: isoDay(1), guests: 2, message: '' });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const send = (e) => {
    e.preventDefault();
    const text = `Hi ${s.siteName}, I'm ${f.name}. I'd like to stay from ${f.checkIn} with ${f.guests} guest(s). ${f.message}`.trim();
    window.open(`${waUrl(s.whatsapp)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    setSent(true);
  };

  const items = [
    s.phone && { Icon: Phone, label: 'Call us', value: s.phone, href: `tel:${s.phone}`, hint: 'Tap to call' },
    s.whatsapp && { Icon: MessageCircle, label: 'WhatsApp', value: s.whatsapp, href: waUrl(s.whatsapp), hint: 'Chat instantly' },
    s.email && { Icon: Mail, label: 'Email', value: s.email, href: `mailto:${s.email}`, hint: 'Write to us' },
    s.instagram && { Icon: Instagram, label: 'Instagram', value: `@${String(s.instagram).replace(/^@/, '')}`, href: igUrl(s.instagram), hint: 'Follow the stay' },
  ].filter(Boolean);

  const mapUrl = s.mapLink || PLACE.url;
  const reach = paras(s.howToReach);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        text="We are here to help you plan the perfect stay in the Naggar valley."
      />

      {/* Premium contact strip */}
      <section className="wrap -mt-10 relative z-10 mb-4">
        <Reveal>
          <div className="surface overflow-hidden p-1 shadow-lift">
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
              {items.map(({ Icon, label, value, href, hint }, i) => (
                <a
                  key={label}
                  href={href}
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="group relative flex items-center gap-4 rounded-[1.35rem] bg-white/40 px-5 py-5 transition duration-300 hover:bg-white/80 hover:shadow-glass"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400/30 to-pine-400/20 text-gold-700 ring-1 ring-gold-500/20 transition group-hover:scale-105 group-hover:from-gold-400/50">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink/50">{label}</span>
                    <span className="mt-0.5 block truncate text-[0.95rem] font-medium text-ink">{value}</span>
                    <span className="mt-0.5 block text-xs text-ink/45 opacity-0 transition group-hover:opacity-100">{hint}</span>
                  </span>
                </a>
              ))}
              {items.length === 0 && (
                <p className="col-span-full p-6 text-center text-ink/60">Contact details can be set in Admin → Site settings.</p>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Main: Address + Form */}
      <section id="enquiry" className="wrap section-y scroll-mt-28 pt-12 md:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          {/* Left column */}
          <div className="space-y-6">
            {s.address && (
              <Reveal>
                <div className="surface relative overflow-hidden p-7 md:p-9">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-400/15 blur-2xl" />
                  <div className="relative flex items-start gap-5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400/40 to-pine-500/20 text-gold-800 ring-1 ring-gold-500/25">
                      <MapPin size={26} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-gold-800">Our address</p>
                      <p className="mt-2 font-serif text-2xl leading-snug text-ink md:text-3xl">{s.address}</p>
                    </div>
                  </div>
                  <div className="relative mt-7 flex flex-wrap gap-3">
                    <a href={directionsUrl} target="_blank" rel="noreferrer" className="bt-gold bt-sm">
                      <Navigation size={15} /> Get directions
                    </a>
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="bt-line bt-sm">
                      <ExternalLink size={15} /> Google Maps
                    </a>
                  </div>
                </div>
              </Reveal>
            )}

            {s.checkInTime && (
              <Reveal delay={80}>
                <div className="glass flex items-center gap-5 rounded-3xl p-6 md:p-7">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine-500/15 text-pine-600">
                    <Clock size={22} />
                  </span>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink/50">Timings</p>
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-ink/90">
                      <span className="font-medium text-ink">Check-in</span> {s.checkInTime}
                      <span className="mx-2 text-ink/30">·</span>
                      <span className="font-medium text-ink">Check-out</span> {s.checkOutTime}
                    </p>
                  </div>
                </div>
              </Reveal>
            )}

            <Reveal delay={120}>
              <div className="rounded-3xl border border-gold-400/25 bg-gradient-to-br from-gold-50/80 to-white/40 p-6 md:p-7">
                <div className="flex items-center gap-2 text-gold-700">
                  <Sparkles size={18} />
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">Prefer a quick chat?</p>
                </div>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">
                  Message us on WhatsApp — we usually reply within a few minutes during the day.
                </p>
                {s.whatsapp && (
                  <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" className="bt-dark bt-sm mt-5">
                    <MessageCircle size={15} /> Open WhatsApp
                  </a>
                )}
              </div>
            </Reveal>
          </div>

          {/* Enquiry form */}
          <Reveal delay={60}>
            <div className="surface relative overflow-hidden p-8 md:p-10">
              <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-pine-400/10 blur-3xl" />
              <div className="relative">
                <p className="eyebrow">Enquiry</p>
                <h2 className="mt-2 font-serif text-4xl md:text-5xl">Send a message</h2>
                <p className="mt-2 text-ink/70">Tell us your dates and we will get back on WhatsApp.</p>

                {sent ? (
                  <div className="mt-8 rounded-2xl border border-pine-400/30 bg-pine-100/50 p-6 text-center">
                    <p className="font-serif text-2xl text-pine-700">WhatsApp opened</p>
                    <p className="mt-2 text-sm text-ink/70">Complete the message there and we will reply soon.</p>
                    <button type="button" onClick={() => setSent(false)} className="bt-line bt-sm mt-5">
                      Send another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={send} className="mt-8 space-y-4">
                    <label className="block">
                      <span className="lbl">Your name</span>
                      <input className="inp" value={f.name} onChange={set('name')} required placeholder="Full name" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="lbl">Arrival date</span>
                        <input className="inp" type="date" min={isoDay(0)} value={f.checkIn} onChange={set('checkIn')} />
                      </label>
                      <label>
                        <span className="lbl">Guests</span>
                        <select className="inp" value={f.guests} onChange={set('guests')}>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="lbl">Message</span>
                      <textarea className="inp" rows="4" value={f.message} onChange={set('message')} placeholder="Any questions or special requests…" />
                    </label>
                    <button type="submit" className="bt-gold mt-2 w-full" disabled={!s.whatsapp}>
                      <Send size={16} /> Send on WhatsApp
                    </button>
                    {!s.whatsapp && (
                      <p className="text-center text-sm text-ink/50">WhatsApp number not set in Admin yet.</p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Our locations (managed in Admin > Locations; the section hides itself when there are none) */}
      <section id="locations" className={`wrap scroll-mt-28 ${hasPlaces ? 'pb-16 md:pb-24' : ''}`}>
        {hasPlaces && (
          <SectionHeading eyebrow="Locations" title="Find a Hi Strangers near you" text="Manali is open today. Kasol, Bir and more homes are on the way." />
        )}
        <LocationCards onLoaded={onPlaces} />
      </section>

      {/* Map + how to reach */}
      <section id="location" className="band section-y">
        <div className="wrap">
          <SectionHeading
            eyebrow="Location"
            title="Find us in the valley"
            text="Haripur, near Naggar · Free private parking on site"
          />
          <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[1.55fr_1fr]">
            <Reveal className="group relative overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-white/60">
              <iframe
                title="Map showing Hi Strangers Stay Manali"
                src={mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[340px] w-full border-0 md:h-full md:min-h-[460px]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
            </Reveal>

            <Reveal delay={100} className="surface flex flex-col p-7 md:p-9">
              <h3 className="font-serif text-3xl md:text-4xl">How to reach</h3>
              <div className="copy mt-4 flex-1 space-y-3 text-[0.95rem] leading-relaxed text-ink/85">
                {(reach.length ? reach : ['Use the directions button to open the exact location in Google Maps.']).map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/10 pt-6">
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="bt-dark bt-sm">
                  <Navigation size={15} /> Directions
                </a>
                <a href={mapUrl} target="_blank" rel="noreferrer" className="bt-line bt-sm">
                  <ExternalLink size={15} /> Open map
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="pt-16"><CustomBlocks page="contact" /></div>
      <CtaBand title="We would love to host you" />
    </>
  );
}