import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import RoomsSection from './RoomsAdmin';
import MealPlanAdmin from './MealPlanAdmin';

// "Rooms" page (meal plans of the property on top, rooms below). The website has one property, so there is no hotel form here:
// the property record is found (or created once, from Site settings) in the background
// and every room you add belongs to it automatically.
export default function HotelsAdmin() {
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await api.get('/hotels/admin/all');
        if (data[0]) { if (live) setHotel(data[0]); return; }
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
        if (live) setHotel(made);
      } catch (e) { if (live) setError(errMsg(e)); }
    })();
    return () => { live = false; };
  }, []);

  if (error) return <div className="notice notice--err">{error}</div>;
  if (!hotel) return <p className="muted">Loading…</p>;
  return (
    <>
      <MealPlanAdmin hotel={hotel} />
      <RoomsSection hotelId={hotel._id} />
    </>
  );
}
