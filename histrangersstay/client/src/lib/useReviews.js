import { useEffect, useState } from 'react';
import api from '../api';
import { useSettings } from '../SettingsContext';
import { parseReviews } from './parse';

/**
 * Guest reviews from the database (Admin > Reviews).
 * If nothing has been added there yet, the old "Guest reviews" lines from Site settings are shown,
 * so the page is never empty during the switch.
 */
export default function useReviews() {
  const { settings } = useSettings();
  const [rows, setRows] = useState(null); // null = still loading

  useEffect(() => {
    let live = true;
    api.get('/reviews')
      .then((r) => { if (live) setRows(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, []);

  if (rows === null) return { reviews: [], loading: true };
  if (rows.length) {
    return {
      loading: false,
      reviews: rows.map((r) => ({ id: r._id, name: r.name, country: r.country || '', text: r.text, rating: r.rating || 5, stayedOn: r.stayedOn || '' })),
    };
  }
  return { loading: false, reviews: parseReviews(settings.reviews).map((r, i) => ({ ...r, id: `s${i}`, rating: 5, stayedOn: '' })) };
}
