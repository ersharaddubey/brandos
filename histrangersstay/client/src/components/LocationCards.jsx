import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import api from '../api';
import SmartImg from './SmartImg';

// Hi Strangers locations (Admin > Locations). Shown inside the Contact page.
// Renders nothing when no location has been added yet. onLoaded(rows) lets the page react once the list is ready.
export default function LocationCards({ onLoaded }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get('/locations').then((r) => setRows(Array.isArray(r.data) ? r.data : [])).catch(() => setRows([]));
  }, []);
  useEffect(() => { if (rows && onLoaded) onLoaded(rows); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rows || rows.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
      {rows.map((l) => {
        const live = l.status === 'live';
        return (
          <article key={l._id} className="surface flex flex-col overflow-hidden">
            {l.image && <SmartImg src={l.image} alt={l.name} className="h-44 w-full object-cover sm:h-48" />}
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <span className={`w-fit rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-widest ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-gold-50 text-gold-800'}`}>{live ? 'Open now' : 'Upcoming'}</span>
              <h3 className="mt-3 text-3xl">{l.name}</h3>
              {(l.city || l.state) && <p className="mt-1 flex items-center gap-2 text-sm text-ink/70"><MapPin size={14} className="shrink-0 text-gold-700" />{[l.city, l.state].filter(Boolean).join(', ')}</p>}
              {l.tagline && <p className="mt-3 font-serif text-lg text-gold-800">{l.tagline}</p>}
              {l.description && <p className="mt-2 text-sm text-ink/78">{l.description}</p>}
              {l.address && <p className="mt-3 text-sm text-ink/70">{l.address}</p>}
              {l.phone && <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="mt-2 flex items-center gap-2 text-sm text-gold-800 hover:underline"><Phone size={14} />{l.phone}</a>}
              <div className="mt-auto pt-5">
                {live
                  ? (l.link?.startsWith('http') ? <a className="bt-gold bt-sm" href={l.link} target="_blank" rel="noreferrer">Visit</a> : <Link className="bt-gold bt-sm" to={l.link || '/stay'}>Book a stay</Link>)
                  : <a className="bt-line bt-sm" href="#enquiry">Ask to be notified</a>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
