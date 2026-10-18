import { Link } from 'react-router-dom';
import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';

// Mobile-only bar that keeps Book / Call / WhatsApp one tap away
export default function StickyCta() {
  const { settings: s } = useSettings();
  const cell = 'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.62rem] font-medium uppercase tracking-widest';
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/20 bg-pine/85 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-xl md:hidden">
      {s.phone && <a href={`tel:${s.phone}`} className={cell}><Phone size={18} />Call</a>}
      {s.whatsapp && <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" className={cell}><MessageCircle size={18} />WhatsApp</a>}
      <Link to="/stay#book" className={`${cell} bg-gold-500`}><CalendarCheck size={18} />Book now</Link>
    </div>
  );
}
