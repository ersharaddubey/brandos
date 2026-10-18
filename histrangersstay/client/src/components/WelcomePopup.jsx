import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Gift, Copy, Check } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useProperty } from '../PropertyContext';

const KEY = 'histay-welcome-popup-last-shown';
const QUIET_PERIOD_MS = 24 * 60 * 60 * 1000;

// Show once on the home-page entry; suppress repeat popups for 24 hours.
export default function WelcomePopup() {
  const { settings: s } = useSettings();
  const { offers } = useProperty();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const offer = offers.find((o) => o.code) || offers[0];
  const enabled = s.popupEnabled !== false && pathname === '/' && (offer || s.announcement);

  useEffect(() => {
    if (!enabled) return undefined;
    try {
      const lastShown = Number(window.localStorage.getItem(KEY) || 0);
      if (lastShown && Date.now() - lastShown < QUIET_PERIOD_MS) return undefined;
    } catch { /* storage may be disabled; continue for this page load */ }
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      try { window.localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
      setOpen(true);
    };
    const timer = window.setTimeout(show, 5001);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  if (!open || !enabled) return null;
  const copy = () => { navigator.clipboard?.writeText(offer.code); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-5 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Special offer">
      <div className="relative w-full max-w-md animate-pop glass-strong holo-frame overflow-hidden rounded-3xl text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/5 hover:bg-black/10"><X size={18} /></button>
        <div className="bg-gradient-to-br from-ink via-ink-700 to-gold-700 px-8 pb-8 pt-10 text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold-500/90"><Gift size={26} /></span>
          <p className="mt-4 text-[0.7rem] uppercase tracking-[0.3em] text-gold-200">Before you go</p>
          <h3 className="mt-2 text-3xl">{offer ? offer.title : 'Book direct with us'}</h3>
        </div>
        <div className="px-8 pb-8 pt-6">
          <p className="text-ink/80">{offer ? offer.description : s.announcement}</p>
          {offer?.code && (
            <button onClick={copy} className="mx-auto mt-5 flex items-center gap-3 rounded-xl border-2 border-dashed border-gold-500 px-5 py-3 font-mono text-lg tracking-[0.25em] text-gold-700">
              {offer.code}{copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
          <Link to={offer?.code ? `/stay?offer=${offer.code}#book` : '/stay#book'} onClick={() => setOpen(false)} className="bt-gold mt-6 w-full">Book my stay</Link>
          <button onClick={() => setOpen(false)} className="mt-3 text-sm text-ink/68 hover:text-ink">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
