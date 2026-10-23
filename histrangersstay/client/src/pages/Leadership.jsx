import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, MessageCircle } from 'lucide-react';
import api from '../api';
import { useSettings } from '../SettingsContext';
import { igUrl, waUrl } from '../config';
import PageTop from '../components/PageTop';
import SmartImg from '../components/SmartImg';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Leadership() {
  const { settings: s } = useSettings();
  const [team, setTeam] = useState(null);
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    api.get('/team').then((r) => setTeam(r.data)).catch(() => setTeam([]));
    api.get('/locations').then((r) => setPlaces(r.data.filter((l) => l.phone || l.address))).catch(() => {});
  }, []);

  return (
    <>
      <PageTop eyebrow="Leadership" title="The people behind Hi Strangers" text="Come as a stranger, leave with memories. Meet the team that hosts you." />
      <div className="wrap pb-16">
        {team === null ? <p className="text-center text-ink/70">Loading…</p> : team.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/70">Team details will appear here soon.</p>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <article key={m._id} className="surface p-7 text-center">
                {m.photo
                  ? <SmartImg src={m.photo} alt={m.name} className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-gold-500/40" />
                  : <span className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-gold-50 font-serif text-3xl text-gold-800 ring-2 ring-gold-500/40">{initials(m.name)}</span>}
                <h2 className="mt-4 text-2xl">{m.name}</h2>
                {m.role && <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gold-800">{m.role}</p>}
                {m.bio && <p className="mt-3 text-sm text-ink/78">{m.bio}</p>}
                <div className="mt-4 flex justify-center gap-3 text-gold-800">
                  {m.phone && <a href={`tel:${m.phone}`} aria-label={`Call ${m.name}`}><Phone size={18} /></a>}
                  {m.email && <a href={`mailto:${m.email}`} aria-label={`Email ${m.name}`}><Mail size={18} /></a>}
                  {m.instagram && <a href={igUrl(m.instagram)} target="_blank" rel="noreferrer" aria-label={`${m.name} on Instagram`}><Instagram size={18} /></a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <section className="band-dark py-16 text-white">
        <div className="wrap max-w-4xl">
          <p className="eyebrow text-gold-300">Contact us</p>
          <h2 className="mt-3 text-4xl">Talk to us</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <ul className="space-y-4 text-white/90">
              {s.phone && <li className="flex gap-3"><Phone size={18} className="mt-1 shrink-0 text-gold-300" /><a href={`tel:${s.phone}`}>{s.phone}</a></li>}
              {s.email && <li className="flex gap-3"><Mail size={18} className="mt-1 shrink-0 text-gold-300" /><a href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.address && <li className="flex gap-3"><MapPin size={18} className="mt-1 shrink-0 text-gold-300" /><span>{s.address}</span></li>}
              {s.whatsapp && <li className="flex gap-3"><MessageCircle size={18} className="mt-1 shrink-0 text-gold-300" /><a href={waUrl(s.whatsapp)} target="_blank" rel="noreferrer">Chat on WhatsApp</a></li>}
            </ul>
            <div className="space-y-4">
              {places.map((l) => (
                <div key={l._id} className="rounded-2xl border border-white/15 p-4">
                  <p className="font-serif text-xl">{l.name}</p>
                  {l.address && <p className="mt-1 text-sm text-white/75">{l.address}</p>}
                  {l.phone && <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="mt-1 block text-sm text-gold-300">{l.phone}</a>}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/contact" className="bt-gold">Send us a message</Link>
            <Link to="/volunteer" className="bt-ghost">Volunteer or collaborate</Link>
          </div>
        </div>
      </section>
    </>
  );
}
