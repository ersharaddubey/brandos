import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import SmartImg from './SmartImg';

// Banner used at the top of every inner page
export default function PageHero({ eyebrow, title, text, img, children }) {
  const { settings: s } = useSettings();
  return (
    <section className="relative isolate overflow-hidden rounded-b-[2.5rem] bg-ink text-white">
      <SmartImg eager src={img || s.heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/25 to-ink/70" />
      <div className="wrap pb-16 pt-40 text-center md:pb-24 md:pt-48">
        <nav className="mb-5 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/78" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-gold-300">Home</Link><ChevronRight size={12} /><span className="text-gold-300">{eyebrow || title}</span>
        </nav>
        <h1 className="animate-fade-up text-5xl leading-[1.02] md:text-7xl">{title}</h1>
        {text && <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-lg font-light text-white/80 [animation-delay:.15s]">{text}</p>}
        {children && <div className="mt-8 animate-fade-up [animation-delay:.25s]">{children}</div>}
      </div>
    </section>
  );
}
