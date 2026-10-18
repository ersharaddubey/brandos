import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fmtDate, inr } from '../api';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e))); }, []);

  if (error) return <div className="notice notice--err">{error}</div>;
  if (!s) return <p className="muted">Loading dashboard…</p>;

  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  const total = Math.max(1, s.counts.bookings);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat"><span>Revenue (confirmed and completed)</span><b>{inr(s.revenue)}</b></div>
        <div className="stat"><span>Bookings</span><b>{s.counts.bookings}</b></div>
                <div className="stat"><span>Rooms</span><b>{s.counts.rooms}</b></div>
        <div className="stat"><span>Active offers</span><b>{s.counts.offers}</b></div>
      </div>

      <div className="two">
        <section className="card">
          <h3>Bookings by status</h3>
          {statuses.map((st) => (
            <div className="bar" key={st}>
              <span>{st}</span>
              <div className="bar__track"><div className={`bar__fill badge--${st}`} style={{ width: `${((s.byStatus[st] || 0) / total) * 100}%` }} /></div>
              <b>{s.byStatus[st] || 0}</b>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>Top hotels</h3>
          {s.topHotels.length === 0 ? <p className="muted">No bookings yet.</p> : (
            <table className="table"><tbody>
              {s.topHotels.map((h) => (
                <tr key={h._id}><td>{h.name}<br /><small className="muted">{h.city}</small></td><td>{h.bookings} bookings</td><td>{inr(h.revenue)}</td></tr>
              ))}
            </tbody></table>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section__head"><h3>Recent bookings</h3><Link to="/admin/bookings" className="btn btn--line btn--sm">See all</Link></div>
        {s.recent.length === 0 ? <p className="muted">No bookings yet. They will appear here when guests reserve a room.</p> : (
          <div className="scroll"><table className="table">
            <thead><tr><th>Reference</th><th>Guest</th><th>Hotel</th><th>Dates</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {s.recent.map((b) => (
                <tr key={b._id}>
                  <td>{b.reference}</td><td>{b.guest.name}</td><td>{b.hotel?.name}</td>
                  <td>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</td><td>{inr(b.totalAmount)}</td>
                  <td><span className={`badge badge--${b.status}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
