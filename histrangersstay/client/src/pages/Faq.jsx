import { Clock, ShieldCheck } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { parseFaqs } from '../lib/parse';
import PageHero from '../components/PageHero';
import FaqList from '../components/FaqList';
import Reveal from '../components/Reveal';
import CtaBand from '../components/CtaBand';

export default function Faq() {
  const { settings: s } = useSettings();
  const faqs = parseFaqs(s.faqs);
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions and answers" text="Quick answers for travellers, plus our house rules." />
      <section className="wrap max-w-3xl section-y">
        {faqs.length === 0 ? <p className="text-center text-ink/70">FAQs will appear once added in Admin → Site settings.</p> : <FaqList faqs={faqs} />}
      </section>
      {(s.checkInTime || s.policies?.length > 0) && (
        <section className="band py-20">
          <div className="wrap grid max-w-5xl gap-6 md:grid-cols-2">
            {(s.checkInTime || s.checkOutTime) && (
              <Reveal className="surface p-8">
                <Clock size={26} className="text-gold-700" /><h3 className="mt-4 text-3xl">Check-in and check-out</h3>
                <p className="mt-4 text-sm uppercase tracking-widest text-ink/68">Check-in</p><p className="text-lg font-medium">{s.checkInTime}</p>
                <p className="mt-4 text-sm uppercase tracking-widest text-ink/68">Check-out</p><p className="text-lg font-medium">{s.checkOutTime}</p>
              </Reveal>
            )}
            {s.policies?.length > 0 && (
              <Reveal delay={100} className="surface p-8">
                <ShieldCheck size={26} className="text-gold-700" /><h3 className="mt-4 text-3xl">House rules</h3>
                <ul className="mt-4 space-y-2.5 text-ink/85">{s.policies.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />{p}</li>)}</ul>
              </Reveal>
            )}
          </div>
          {s.finePrint && <p className="wrap mt-8 max-w-5xl text-sm text-ink/70"><b>The fine print.</b> {s.finePrint}</p>}
        </section>
      )}
      <CtaBand />
    </>
  );
}
