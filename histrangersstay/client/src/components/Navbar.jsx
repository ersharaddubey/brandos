import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Phone, User, LogOut, Sparkles, ChevronDown, Instagram, Youtube, Images } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { waUrl } from '../config';

const LINKS = [
  ['/', 'Home', true],
  ['/stay', 'Stay'],
  ['/experiences', 'Experiences'],
  ['/events', 'Events', false, true],
  ['/offers', 'Offers'],
  ['/reviews', 'Reviews'],
  ['/cafe', 'Cafe'],
  ['/locations', 'Locations', false, true],
  ['/contact', 'Contact'],
];

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { settings: s } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [mobileSocial, setMobileSocial] = useState(false);
  const socialRef = useRef(null);
  const [barOff, setBarOff] = useState(() => { try { return sessionStorage.getItem('bar-off') === '1'; } catch { return false; } });

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setOpen(false); setSocialOpen(false); setMobileSocial(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  // Close desktop social dropdown on outside click
  useEffect(() => {
    if (!socialOpen) return;
    const close = (e) => {
      if (socialRef.current && !socialRef.current.contains(e.target)) setSocialOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [socialOpen]);

  const solid = scrolled || pathname !== '/' || open;
  const showBar = s.announcement && !barOff;
  const closeBar = () => { setBarOff(true); try { sessionStorage.setItem('bar-off', '1'); } catch { /* ignore */ } };

  const socialActive = ['/gallery', '/instagram-gallery', '/youtube-gallery'].includes(pathname);

  const socialItemClass = (active) =>
    `flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${active ? 'bg-gold-500/15 text-gold-800' : 'text-ink/85 hover:bg-gold-500/10 hover:text-gold-800'}`;

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
        <div className="wrap flex h-[72px] items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt={s.siteName} className={`h-11 w-11 rounded-full object-cover shadow-md ring-2 transition ${solid ? 'ring-gold-500/50' : 'ring-white/50'}`} />
          </Link>

          <nav className="hidden items-center gap-5 text-[0.72rem] xl:gap-7 font-medium uppercase tracking-[0.2em] lg:flex" aria-label="Main">
            {LINKS.map(([to, label, end, xlOnly]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `${xlOnly ? 'hidden xl:block' : ''} border-b py-1 transition ${isActive ? (solid ? 'border-gold-700 text-gold-800' : 'border-gold-300 text-gold-200') : 'border-transparent hover:border-gold-500'}`}>{label}</NavLink>
            ))}

            {/* Social Media dropdown */}
            <div className="relative" ref={socialRef}>
              <button
                type="button"
                onClick={() => setSocialOpen((v) => !v)}
                aria-expanded={socialOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 border-b py-1 transition uppercase tracking-[0.2em] ${socialActive || socialOpen ? (solid ? 'border-gold-700 text-gold-800' : 'border-gold-300 text-gold-200') : 'border-transparent hover:border-gold-500'}`}
              >
                Social
                <ChevronDown size={14} className={`transition ${socialOpen ? 'rotate-180' : ''}`} />
              </button>
              {socialOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/95 py-2 text-ink shadow-lift backdrop-blur-xl normal-case tracking-normal">
                  <Link
                    to="/instagram-gallery"
                    className={socialItemClass(pathname === '/instagram-gallery')}
                    onClick={() => setSocialOpen(false)}
                  >
                    <Instagram size={16} className="text-gold-700" />
                    Instagram Gallery
                  </Link>
                  <Link
                    to="/youtube-gallery"
                    className={socialItemClass(pathname === '/youtube-gallery')}
                    onClick={() => setSocialOpen(false)}
                  >
                    <Youtube size={16} className="text-gold-700" />
                    YouTube Gallery
                  </Link>
                  <Link
                    to="/gallery"
                    className={socialItemClass(pathname === '/gallery')}
                    onClick={() => setSocialOpen(false)}
                  >
                    <Images size={16} className="text-gold-700" />
                    Gallery
                  </Link>
                </div>
              )}
            </div>
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
        <div className="fixed inset-0 top-[96px] z-40 flex animate-fade-in flex-col overflow-y-auto bg-pine/90 backdrop-blur-2xl px-6 pb-10 pt-8 text-white lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `border-b border-white/10 py-4 font-serif text-3xl ${isActive ? 'text-gold-400' : ''}`}>{label}</NavLink>
            ))}

            {/* Mobile Social Media accordion */}
            <button
              type="button"
              onClick={() => setMobileSocial((v) => !v)}
              className={`flex w-full items-center justify-between border-b border-white/10 py-4 font-serif text-3xl text-left ${socialActive ? 'text-gold-400' : ''}`}
            >
              Social Media
              <ChevronDown size={22} className={`transition ${mobileSocial ? 'rotate-180' : ''}`} />
            </button>
            {mobileSocial && (
              <div className="border-b border-white/10 pb-3 pl-4">
                <NavLink to="/instagram-gallery" className={({ isActive }) => `flex items-center gap-3 py-3 text-xl ${isActive ? 'text-gold-400' : 'text-white/85'}`}>
                  <Instagram size={20} /> Instagram Gallery
                </NavLink>
                <NavLink to="/youtube-gallery" className={({ isActive }) => `flex items-center gap-3 py-3 text-xl ${isActive ? 'text-gold-400' : 'text-white/85'}`}>
                  <Youtube size={20} /> YouTube Gallery
                </NavLink>
                <NavLink to="/gallery" className={({ isActive }) => `flex items-center gap-3 py-3 text-xl ${isActive ? 'text-gold-400' : 'text-white/85'}`}>
                  <Images size={20} /> Gallery
                </NavLink>
              </div>
            )}

            {user && <NavLink to="/account" className={({ isActive }) => `border-b border-white/10 py-4 font-serif text-3xl ${isActive ? 'text-gold-400' : ''}`}>My account</NavLink>}
            <NavLink to="/booking" className="border-b border-white/10 py-4 font-serif text-3xl">Find booking</NavLink>
            <NavLink to="/checkin" className="border-b border-white/10 py-4 font-serif text-3xl">Web check-in</NavLink>
            <NavLink to="/leadership" className="border-b border-white/10 py-4 font-serif text-3xl">Leadership</NavLink>
            <NavLink to="/volunteer" className="border-b border-white/10 py-4 font-serif text-3xl">Volunteer</NavLink>
          </nav>
          <div className="mt-8 grid gap-3">
            <Link to="/stay#book" className="bt-gold">Book your stay</Link>
            {s.whatsapp && <a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer" className="bt-ghost">WhatsApp us</a>}
            {user ? <button className="bt-ghost" onClick={logout}>Log out ({user.name?.split(' ')[0]})</button> : <Link to="/login" className="bt-ghost">Log in</Link>}
          </div>
        </div>
      )}
    </header>
  );
}
