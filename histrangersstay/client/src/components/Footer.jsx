import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Youtube, MessageCircle, Clock } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { igUrl, waUrl, ytUrl } from '../config';

const col = 'mb-5 text-[0.72rem] font-medium uppercase tracking-[0.28em] text-gold-400';
const lk = 'block py-1 text-white/80 transition hover:text-gold-300';

export default function Footer() {
  const { settings: s } = useSettings();
  return (
    <footer className="band-dark pb-24 pt-20 text-[0.95rem] text-white/85 md:pb-8">
      <div className="wrap grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Link to="/" className="inline-block">
            <img src="/logo.jpg" alt={s.siteName} className="h-16 w-16 rounded-full object-cover shadow-lg ring-2 ring-gold-400/40" />
          </Link>
          <p className="mt-3 max-w-xs leading-relaxed">{s.tagline}</p>
          <div className="mt-6 flex gap-3">
            {s.instagram && (
              <a href={igUrl(s.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300">
                <Instagram size={18} />
              </a>
            )}
            {s.youtube && (
              <a href={ytUrl(s.youtube)} target="_blank" rel="noreferrer" aria-label="YouTube" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300">
                <Youtube size={18} />
              </a>
            )}
            {s.whatsapp && (
              <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300">
                <MessageCircle size={18} />
              </a>
            )}
            {s.phone && (
              <a href={`tel:${s.phone}`} aria-label="Call" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300">
                <Phone size={18} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className={col}>Explore</h4>
          <Link className={lk} to="/stay">Rooms and booking</Link>
          <Link className={lk} to="/experiences">Experiences</Link>
          <Link className={lk} to="/events">Events</Link>
          <Link className={lk} to="/gallery">Gallery</Link>
          <Link className={lk} to="/instagram-gallery">Instagram Gallery</Link>
          <Link className={lk} to="/youtube-gallery">YouTube Gallery</Link>
          <Link className={lk} to="/offers">Offers</Link>
          <Link className={lk} to="/reviews">Guest reviews</Link>
        </div>

        <div>
          <h4 className={col}>Plan your trip</h4>
          <Link className={lk} to="/about">About us</Link>
          <Link className={lk} to="/facilities">Facilities</Link>
          <Link className={lk} to="/nearby">Around the stay</Link>
          <Link className={lk} to="/faq">FAQ and house rules</Link>
          <Link className={lk} to="/booking">Find my booking</Link>
        </div>

        <div>
          <h4 className={col}>Get in touch</h4>
          <ul className="space-y-3">
            {s.address && <li className="flex gap-3"><MapPin size={17} className="mt-1 shrink-0 text-gold-400" /><span>{s.address}</span></li>}
            {s.phone && <li className="flex gap-3"><Phone size={17} className="mt-1 shrink-0 text-gold-400" /><a href={`tel:${s.phone}`} className="hover:text-gold-300">{s.phone}</a></li>}
            {s.email && <li className="flex gap-3"><Mail size={17} className="mt-1 shrink-0 text-gold-400" /><a href={`mailto:${s.email}`} className="hover:text-gold-300">{s.email}</a></li>}
            {s.checkInTime && <li className="flex gap-3"><Clock size={17} className="mt-1 shrink-0 text-gold-400" /><span>Check-in {s.checkInTime}<br />Check-out {s.checkOutTime}</span></li>}
          </ul>
        </div>
      </div>

      <div className="wrap mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45">
        <p>© {new Date().getFullYear()} {s.siteName}. All rights reserved.</p>
        <Link to="/admin" className="hover:text-white/80">Admin</Link>
      </div>
    </footer>
  );
}
