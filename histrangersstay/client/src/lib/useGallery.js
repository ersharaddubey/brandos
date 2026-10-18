import { useEffect, useState } from 'react';
import api from '../api';
import { cld } from './cloudinary';

let cache = null;
let pending = null;

export const toTile = (g) => ({
  id: g._id,
  src: cld(g.url, 'w_2000,c_limit'),
  thumb: cld(g.url, 'w_1100,c_limit'),
  caption: g.caption || '',
  size: g.size || 'auto',
});

// Photos managed in Admin > Gallery
export default function useGallery() {
  const [items, setItems] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    if (cache) return undefined;
    let live = true;
    if (!pending) pending = api.get('/gallery').then((r) => { cache = r.data; return cache; }).finally(() => { pending = null; });
    pending.then((d) => { if (live) { setItems(d); setLoading(false); } }).catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  return { tiles: items.map(toTile), loading };
}
