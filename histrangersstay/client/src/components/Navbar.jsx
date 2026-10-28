import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Phone, User, LogOut, Sparkles, ChevronDown, Instagram, Youtube, Images } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';

// Main menu. Items with "items" open as a dropdown (desktop) or an accordion (mobile).
const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/stay', label: 'Stay' },
  { to: '/cafe', label: 'Cafe' },
  {
    label: 'Explore',
    items: [
      ['/experiences', 'Experiences'],
      ['/events', 'Events'],
      ['/offers', 'Offers'],
      ['/reviews', 'Reviews'],
    ],
  },
  {
    label: 'Social',
    items: [
      ['/instagram-gallery', 'Instagram Gallery', Instagram],
      ['/youtube-gallery', 'YouTube Gallery', Youtube],
      ['/gallery', 'Gallery', Images],
    ],
  },
  { to: '/contact', label: 'Contact' },
];

// Smaller links that only live in the mobile menu
const QUICK = [
  ['/booking', 'Find booking'],
  ['/checkin', 'Web check-in'],
  ['/leadership', 'Leadership'],
  ['/volunteer', 'Volunteer'],
];

function DesktopDropdown({ item, solid, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);
  const active = item.items.some(([to]) => pathname === to);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const enter = () => { clearTimeout(timer.current); setOpen(true); };
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 140); };

  return (
    <div className="relative" ref={ref} onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 border-b py-1 uppercase tracking-[0.2em] transition ${active || open ? (solid ? 'border-gold-700 text-gold-800' : 'border-gold-300 text-gold-200') : 'border-transparent hover:border-gold-500'}`}
      >
        {item.label}
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/95 py-2 normal-case tracking-normal text-ink shadow-lift backdrop-blur-xl">
            {item.items.map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${pathname === to ? 'bg-gold-500/15 text-gold-800' : 'text-ink/85 hover:bg-gold-500/10 hover:text-gold-800'}`}
              >
                {Icon && <Icon size={16} className="text-gold-700" />}
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileGroup({ item, pathname }) {
  const active = item.items.some(([to]) => pathname === to);
  const [open, setOpen] = useState(active);
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between py-3.5 text-left font-serif text-2xl ${active ? 'text-gold-400' : ''}`}
      >
        {item.label}
        <ChevronDown size={20} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-3 pl-3">
          {item.items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 py-2.5 text-lg ${isActive ? 'text-gold-400' : 'text-white/85'}`}>
              {Icon && <Icon size={18} />}{label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { settings: s } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [barOff, setBarOff] = useState(() => { try { return sessionStorage.getItem('bar-off') === '1'; } catch { return false; } });

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const solid = scrolled || pathname !== '/' || open;
  const showBar = s.announcement && !barOff;
  const closeBar = () => { setBarOff(true); try { sessionStorage.setItem('bar-off', '1'); } catch { /* ignore */ } };

  const topLink = ({ isActive }) => `border-b py-1 transition ${isActive ? (solid ? 'border-gold-700 text-gold-800' : 'border-gold-300 text-gold-200') : 'border-transparent hover:border-gold-500'}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {showBar && (
        <div className={`grid transition-[grid-template-rows] duration-300 ${scrolled ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
          <div className="overflow-hidden bg-pine/85 backdrop-blur-xl text-gold-100">
            <div className="wrap flex items-center justify-center gap-3 py-2 text-center text-[0.78rem] tracking-wide">
              <Sparkles size={13} className="hidden shrink-0 text-gold-400 sm:block" />
              <Link to="/offers" className="hover:text-white">{s.announcement}</Link>
              <button onClick={closeBar} aria-label="Dismiss" className="ml-1 shrink-0 text-gold-100/60 hover:text-white"><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div className={`transition duration-300 mx-3 mt-3 rounded-full lg:mx-auto lg:mt-4 lg:max-w-[76rem] ${solid ? 'spatial-ornament bg-white/45 text-ink backdrop-blur-2xl backdrop-saturate-150 border border-white/70' : 'bg-black/20 text-white backdrop-blur-xl border border-white/25'}`}>
        <div className="wrap flex h-[64px] items-center justify-between gap-4 sm:h-[72px] lg:gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt={s.siteName} className={`h-10 w-10 rounded-full object-cover shadow-md ring-2 transition sm:h-11 sm:w-11 ${solid ? 'ring-gold-500/50' : 'ring-white/50'}`} />
          </Link>

          <nav className="hidden items-center gap-6 text-[0.72rem] font-medium uppercase tracking-[0.2em] lg:flex xl:gap-9" aria-label="Main">
            {NAV.map((item) => (item.items
              ? <DesktopDropdown key={item.label} item={item} solid={solid} pathname={pathname} />
              : <NavLink key={item.to} to={item.to} end={item.end} className={topLink}>{item.label}</NavLink>))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-2 whitespace-nowrap text-sm hover:text-gold-700" aria-label="Call us"><Phone size={15} /><span className="hidden 2xl:inline">{s.phone}</span></a>}
            {user ? (
              <span className="flex items-center gap-3">
                <Link to="/account" className="flex items-center gap-1.5 whitespace-nowrap text-xs uppercase tracking-widest hover:text-gold-700" title="My account and bookings"><User size={15} />{user.name?.split(' ')[0]}</Link>
                <button onClick={logout} className="hover:text-gold-700" title="Log out" aria-label="Log out"><LogOut size={14} /></button>
              </span>
            ) : (
              <Link to="/login" className="whitespace-nowrap text-xs uppercase tracking-widest hover:text-gold-700">Log in</Link>
            )}
            <Link to="/stay#book" className="bt-gold bt-sm">Book now</Link>
          </div>

          <button className="grid h-11 w-11 place-items-center lg:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex animate-fade-in flex-col overflow-y-auto bg-pine/95 px-5 pb-10 pt-6 text-white backdrop-blur-2xl sm:px-8 lg:hidden"
          style={{ top: showBar && !scrolled ? 128 : 92 }}
        >
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((item) => (item.items
              ? <MobileGroup key={item.label} item={item} pathname={pathname} />
              : <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `border-b border-white/10 py-3.5 font-serif text-2xl ${isActive ? 'text-gold-400' : ''}`}>{item.label}</NavLink>))}
          </nav>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {user && <NavLink to="/account" className="col-span-2 rounded-xl border border-gold-400/40 bg-white/5 px-4 py-3 text-center text-sm font-medium text-gold-300">My account</NavLink>}
            {QUICK.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `rounded-xl border border-white/15 px-4 py-3 text-center text-sm ${isActive ? 'text-gold-400' : 'text-white/90'}`}>{label}</NavLink>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            <Link to="/stay#book" className="bt-gold">Book your stay</Link>
            {s.whatsapp && <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" className="bt-ghost">WhatsApp us</a>}
            {user ? <button className="bt-ghost" onClick={logout}>Log out ({user.name?.split(' ')[0]})</button> : <Link to="/login" className="bt-ghost">Log in</Link>}
          </div>
        </div>
      )}
    </header>
  );
}
