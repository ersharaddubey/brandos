import { useEffect, useState } from 'react';
import api from '../api';

/**
 * Which rooms are still free for the chosen dates.
 * Returns { map, loading }: map is { [roomId]: { left, available, totalRooms } } or null when unknown
 * (dates invalid, or the server could not be reached, in which case every room stays visible and
 * the server still checks again when the booking is made).
 */
export default function useAvailability(checkIn, checkOut, hotelId) {
  const [state, setState] = useState({ map: null, loading: false });

  useEffect(() => {
    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) { setState({ map: null, loading: false }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    api.get('/rooms/availability', { params: { checkIn, checkOut, ...(hotelId ? { hotel: hotelId } : {}) } })
      .then((r) => {
        if (!live) return;
        const map = {};
        (Array.isArray(r.data) ? r.data : []).forEach((a) => { map[a.room] = a; });
        setState({ map, loading: false });
      })
      .catch(() => { if (live) setState({ map: null, loading: false }); });
    return () => { live = false; };
  }, [checkIn, checkOut, hotelId]);

  return state;
}
