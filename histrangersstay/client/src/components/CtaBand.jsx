import { Link } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';
import SmartImg from './SmartImg';

export default function CtaBand({ title = 'Ready for the mountains?', text = 'Pick your dates and reserve in a minute. No online payment, you pay at the property.' }) {
  const { settings: s } = useSettings();
  return (
    <section className="relative isolate overflow-hidden bg-ink py-24 text-center text-white md:py-32">
      <SmartImg src={s.heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/80" />
      <div className="wrap glass-dark max-w-3xl rounded-[2rem] px-6 py-12 md:px-14 md:py-16">
        <p className="eyebrow !text-gold-300">Your stay awaits</p>
        <h2 className="mt-4 text-5xl leading-[1.03] md:text-6xl">{title}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg font-light text-white/88">{text}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link to="/stay#book" className="bt-gold">Book your stay</Link>
          {s.whatsapp && <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" className="bt-ghost"><MessageCircle size={16} />WhatsApp</a>}
          {s.phone && <a href={`tel:${s.phone}`} className="bt-ghost"><Phone size={16} />Call us</a>}
        </div>
      </div>
    </section>
  );
}
