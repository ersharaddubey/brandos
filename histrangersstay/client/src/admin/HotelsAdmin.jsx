import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import RoomsSection from './RoomsAdmin';

// "Rooms" page. The website has one property, so there is no hotel form here:
// the property record is found (or created once, from Site settings) in the background
// and every room you add belongs to it automatically.
export default function HotelsAdmin() {
  const [hotelId, setHotelId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await api.get('/hotels/admin/all');
        if (data[0]) { if (live) setHotelId(data[0]._id); return; }
        // First time only: make the property record from the site name
        const { data: s } = await api.get('/settings');
        const { data: made } = await api.post('/hotels', {
          name: s.siteName || 'Hi Strangers Stay',
          city: 'Manali',
          state: 'Himachal Pradesh',
          type: 'Hostel',
          tagline: s.tagline || '',
          address: s.address || '',
          featured: true,
          active: true,
        });
        if (live) setHotelId(made._id);
      } catch (e) { if (live) setError(errMsg(e)); }
    })();
    return () => { live = false; };
  }, []);

  if (error) return <div className="notice notice--err">{error}</div>;
  if (!hotelId) return <p className="muted">Loading…</p>;
  return <RoomsSection hotelId={hotelId} />;
}
