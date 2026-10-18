import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

// One property only: loads the first active hotel, its rooms and the live offers once.
const Ctx = createContext({ hotel: null, rooms: [], offers: [], loading: true, error: false });
export const useProperty = () => useContext(Ctx);

export function PropertyProvider({ children }) {
  const [state, setState] = useState({ hotel: null, rooms: [], offers: [], loading: true, error: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      // Offers load on their own, so a problem with hotel or rooms never hides them
      const offers = await api.get('/offers').then((r) => r.data).catch(() => []);
      try {
        const h = await api.get('/hotels');
        const hotel = h.data[0] || null;
        const rooms = hotel ? (await api.get('/rooms', { params: { hotel: hotel._id } })).data : [];
        if (alive) setState({ hotel, rooms, offers, loading: false, error: false });
      } catch {
        if (alive) setState((s) => ({ ...s, offers, loading: false, error: true }));
      }
    })();
    return () => { alive = false; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
