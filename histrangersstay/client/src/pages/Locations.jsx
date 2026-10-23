import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import api from '../api';
import PageTop from '../components/PageTop';
import SmartImg from '../components/SmartImg';

export default function Locations() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/locations').then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  return (
    <>
      <PageTop eyebrow="Locations" title="Find a Hi Strangers near you" text="Manali is open today. Kasol, Bir and more homes are on the way." />
      <div className="wrap pb-24">
        {rows === null ? <p className="text-center text-ink/70">Loading…</p> : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink/70">Locations will appear here soon.</p>
        ) : (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => {
              const live = l.status === 'live';
              return (
                <article key={l._id} className={`surface flex flex-col overflow-hidden ${live ? '' : 'opacity-95'}`}>
                  {l.image && <SmartImg src={l.image} alt={l.name} className="h-48 w-full object-cover" />}
                  <div className="flex flex-1 flex-col p-6">
                    <span className={`w-fit rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-widest ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-gold-50 text-gold-800'}`}>{live ? 'Open now' : 'Upcoming'}</span>
                    <h2 className="mt-3 text-3xl">{l.name}</h2>
                    {(l.city || l.state) && <p className="mt-1 flex items-center gap-2 text-sm text-ink/70"><MapPin size={14} className="text-gold-700" />{[l.city, l.state].filter(Boolean).join(', ')}</p>}
                    {l.tagline && <p className="mt-3 font-serif text-lg text-gold-800">{l.tagline}</p>}
                    {l.description && <p className="mt-2 text-sm text-ink/78">{l.description}</p>}
                    {l.address && <p className="mt-3 text-sm text-ink/70">{l.address}</p>}
                    {l.phone && <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="mt-2 flex items-center gap-2 text-sm text-gold-800 hover:underline"><Phone size={14} />{l.phone}</a>}
                    <div className="mt-auto pt-5">
                      {live
                        ? (l.link?.startsWith('http') ? <a className="bt-gold bt-sm" href={l.link} target="_blank" rel="noreferrer">Visit</a> : <Link className="bt-gold bt-sm" to={l.link || '/stay'}>Book a stay</Link>)
                        : <Link className="bt-line bt-sm" to="/contact">Ask to be notified</Link>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
