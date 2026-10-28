import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Youtube, MessageCircle, Clock } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { igUrl, waUrl, ytUrl } from '../config';

const col = 'mb-4 text-[0.72rem] font-medium uppercase tracking-[0.28em] text-gold-400';
const lk = 'block py-1 text-white/80 transition hover:text-gold-300';
const social = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300';

// Footer links grouped by topic: four columns of similar length, two per row on phones
const GROUPS = [
  ['Stay and book', [
    ['/stay', 'Rooms and booking'],
    ['/offers', 'Offers'],
    ['/booking', 'Find my booking'],
    ['/checkin', 'Web check-in'],
    ['/facilities', 'Facilities'],
  ]],
  ['Cafe and food', [
    ['/cafe', 'Order from the cafe'],
    ['/cafe?mode=stay', 'Add food to your stay'],
    ['/reviews?tab=food', 'Food reviews'],
    ['/reviews', 'Stay reviews'],
  ]],
  ['Discover', [
    ['/experiences', 'Experiences'],
    ['/events', 'Events'],
    ['/nearby', 'Around the stay'],
    ['/gallery', 'Photo gallery'],
    ['/instagram-gallery', 'Instagram Gallery'],
    ['/youtube-gallery', 'YouTube Gallery'],
  ]],
  ['About us', [
    ['/about', 'Our story'],
    ['/leadership', 'Leadership'],
    ['/volunteer', 'Volunteer and collaborate'],
    ['/faq', 'FAQ and house rules'],
    ['/contact', 'Contact and locations'],
  ]],
];

export default function Footer() {
  const { settings: s } = useSettings();
  return (
    <footer className="band-dark pb-24 pt-14 text-[0.95rem] text-white/85 md:pb-8 md:pt-20">
      <div className="wrap">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4 lg:gap-x-10">
          {GROUPS.map(([title, links]) => (
            <div key={title}>
              <h4 className={col}>{title}</h4>
              {links.map(([to, label]) => <Link key={to} className={lk} to={to}>{label}</Link>)}
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[1fr_1.6fr] lg:items-start lg:gap-14">
          <div>
            <Link to="/" className="inline-block">
              <img src="/logo.jpg" alt={s.siteName} className="h-14 w-14 rounded-full object-cover shadow-lg ring-2 ring-gold-400/40 sm:h-16 sm:w-16" />
            </Link>
            <p className="mt-3 max-w-sm leading-relaxed">{s.tagline}</p>
            <div className="mt-5 flex gap-3">
              {s.instagram && <a href={igUrl(s.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram" className={social}><Instagram size={18} /></a>}
              {s.youtube && <a href={ytUrl(s.youtube)} target="_blank" rel="noreferrer" aria-label="YouTube" className={social}><Youtube size={18} /></a>}
              {s.whatsapp && <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={social}><MessageCircle size={18} /></a>}
              {s.phone && <a href={`tel:${s.phone}`} aria-label="Call" className={social}><Phone size={18} /></a>}
            </div>
          </div>

          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {s.address && <li className="flex gap-3 sm:col-span-2"><MapPin size={17} className="mt-1 shrink-0 text-gold-400" /><span>{s.address}</span></li>}
            {s.phone && <li className="flex gap-3"><Phone size={17} className="mt-1 shrink-0 text-gold-400" /><a href={`tel:${s.phone}`} className="hover:text-gold-300">{s.phone}</a></li>}
            {s.email && <li className="flex min-w-0 gap-3"><Mail size={17} className="mt-1 shrink-0 text-gold-400" /><a href={`mailto:${s.email}`} className="break-all hover:text-gold-300">{s.email}</a></li>}
            {s.checkInTime && <li className="flex gap-3"><Clock size={17} className="mt-1 shrink-0 text-gold-400" /><span>Check-in {s.checkInTime}<br />Check-out {s.checkOutTime}</span></li>}
          </ul>
        </div>
      </div>

      <div className="wrap mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45">
        <p>© {new Date().getFullYear()} {s.siteName}. All rights reserved.</p>
        <Link to="/admin" className="hover:text-white/80">Admin</Link>
      </div>
    </footer>
  );
}
