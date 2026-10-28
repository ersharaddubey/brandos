import { useEffect, useState } from 'react';
import api from '../api';
import { useSettings } from '../SettingsContext';
import { parseReviews } from './parse';

/**
 * Guest reviews from the database (Admin > Reviews).
 *   useReviews()        -> stay reviews (rooms and property)
 *   useReviews('food')  -> food and cafe reviews
 * For stay reviews, if nothing has been added in the database yet, the old "Guest reviews" lines from
 * Site settings are shown, so the page is never empty during the switch.
 */
export default function useReviews(type = 'stay') {
  const { settings } = useSettings();
  const [rows, setRows] = useState(null); // null = still loading

  useEffect(() => {
    let live = true;
    setRows(null);
    api.get('/reviews', { params: { type } })
      .then((r) => { if (live) setRows(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [type]);

  if (rows === null) return { reviews: [], loading: true };
  if (rows.length) {
    return {
      loading: false,
      reviews: rows.map((r) => ({ id: r._id, name: r.name, country: r.country || '', text: r.text, rating: r.rating || 5, stayedOn: r.stayedOn || '' })),
    };
  }
  if (type !== 'stay') return { loading: false, reviews: [] };
  return { loading: false, reviews: parseReviews(settings.reviews).map((r, i) => ({ ...r, id: `s${i}`, rating: 5, stayedOn: '' })) };
}
