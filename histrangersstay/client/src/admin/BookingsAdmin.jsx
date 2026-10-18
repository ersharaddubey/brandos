import { useEffect, useState } from 'react';
import api, { errMsg, fmtDate, inr } from '../api';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingsAdmin() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/bookings', { params: { status: filter } })
      .then((r) => setRows(r.data))
      .catch((e) => setMsg({ err: true, text: errMsg(e) }))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const setStatus = async (b, status) => {
    try {
      await api.patch(`/bookings/${b._id}/status`, { status });
      setRows((rs) => rs.map((r) => (r._id === b._id ? { ...r, status } : r)));
      setMsg({ text: `Booking ${b.reference} marked ${status}` });
    } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete booking ${b.reference}? This cannot be undone.`)) return;
    try {
      await api.delete(`/bookings/${b._id}`);
      setRows((rs) => rs.filter((r) => r._id !== b._id));
      setMsg({ text: 'Booking deleted' });
    } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };

  return (
    <>
      <div className="section__head"><h1>Bookings</h1></div>
      <div className="tabs">
        {['', ...STATUSES].map((s) => (
          <button key={s || 'all'} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s || 'All'}</button>
        ))}
      </div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading bookings…</p> : rows.length === 0 ? <p className="muted">No bookings{filter ? ` with status ${filter}` : ''} yet.</p> : (
          <table className="table">
            <thead><tr><th>Reference</th><th>Guest</th><th>Hotel and room</th><th>Stay</th><th>Coupon and food</th><th>Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b._id}>
                  <td><b>{b.reference}</b><br /><small className="muted">{fmtDate(b.createdAt)}</small></td>
                  <td>{b.guest.name}<br /><small className="muted">{b.guest.phone}<br />{b.guest.email}</small></td>
                  <td>{b.hotel?.name}<br /><small className="muted">{b.room?.name}</small></td>
                  <td>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}<br /><small className="muted">{b.nights} nights · {b.adults}A {b.children}C</small></td>
                  <td>
                    {b.couponCode ? <><b>{b.couponCode}</b>{b.discount > 0 && <small className="muted"> (− {inr(b.discount)})</small>}</> : <small className="muted">No coupon</small>}
                    <br />
                    {(b.food || []).length ? <small>{b.food.map((l) => `${l.name} × ${l.qty}`).join(', ')}<br /><span className="muted">Food {inr(b.foodTotal)}</span></small> : <small className="muted">No food</small>}
                  </td>
                  <td>{inr(b.totalAmount)}</td>
                  <td>
                    <select className={`status badge--${b.status}`} value={b.status} onChange={(e) => setStatus(b, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="link danger" onClick={() => remove(b)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
