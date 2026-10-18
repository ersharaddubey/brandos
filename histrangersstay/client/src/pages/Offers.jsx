import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, CalendarCheck } from 'lucide-react';
import api, { errMsg } from '../api';
import { useSettings } from '../SettingsContext';
import { parsePairs } from '../lib/parse';
import amenityIcon from '../components/amenityIcon';
import PageHero from '../components/PageHero';
import { OfferCard } from '../components/OfferCarousel';
import Reveal from '../components/Reveal';
import CustomBlocks from '../components/CustomBlocks';
import CtaBand from '../components/CtaBand';

const STEPS = [[Gift, 'Pick an offer', 'Choose the offer that suits your dates.'], [Copy, 'Copy the code', 'Tap the code on the offer card.'], [CalendarCheck, 'Add it when you book', 'Paste it in the offer code field on the booking form.']];

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    api.get('/offers')
      .then((r) => { if (live) setOffers(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { if (live) setErr(errMsg(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  const { settings: s } = useSettings();
  const perks = parsePairs(s.whyUs);
  return (
    <>
      <PageHero eyebrow="Offers" title="Offers and packages" text="Book directly and enjoy extra value on your stay." />
      <section className="wrap section-y">
        {loading ? (
          <p className="text-center text-ink/70">Loading offers…</p>
        ) : err ? (
          <div className="surface mx-auto max-w-xl p-10 text-center"><h2 className="text-3xl">Could not load offers</h2><p className="mt-2 text-ink/78">{err}</p></div>
        ) : offers.length === 0 ? (
          <div className="surface mx-auto max-w-xl p-10 text-center"><Gift size={36} className="mx-auto text-gold-500" /><h2 className="mt-4 text-3xl">No offers right now</h2><p className="mt-2 text-ink/78">Check back soon, or ask us on WhatsApp for the best rate.</p><Link to="/contact" className="bt-dark mt-6">Contact us</Link></div>
        ) : (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{offers.map((o, i) => <Reveal key={o._id} delay={i * 80}><OfferCard o={o} className="h-full" /></Reveal>)}</div>
        )}
      </section>

      <section className="band py-20">
        <div className="wrap">
          <h2 className="mb-12 text-center text-4xl md:text-5xl">How to redeem</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(([Icon, t, d], i) => (
              <Reveal key={t} delay={i * 90} className="surface p-8 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/50 border border-white/70 text-gold-700 backdrop-blur-md"><Icon size={24} /></span>
                <h3 className="mt-5 text-2xl">{i + 1}. {t}</h3><p className="mt-2 text-ink/78">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {perks.length > 0 && (
        <section className="wrap section-y">
          <h2 className="mb-12 text-center text-4xl md:text-5xl">Perks of booking with us</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p) => { const Icon = amenityIcon(`${p.title} ${p.desc}`); return (
              <div key={p.title} className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold-300 text-gold-700"><Icon size={26} /></span><h3 className="mt-4 text-2xl">{p.title}</h3><p className="mt-1 text-sm text-ink/78">{p.desc}</p></div>
            ); })}
          </div>
        </section>
      )}
      <CustomBlocks page="offers" />
      <CtaBand />
    </>
  );
}
