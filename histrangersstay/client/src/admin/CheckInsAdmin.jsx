import { Fragment, useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../api';

const BADGE = { submitted: 'pending', 'checked-in': 'confirmed', cancelled: 'cancelled' };

export default function CheckInsAdmin() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = () => { setLoading(true); api.get('/checkin/admin/all').then((r) => setRows(r.data)).catch((e) => setMsg({ err: true, text: errMsg(e) })).finally(() => setLoading(false)); };
  useEffect(load, []);

  const setStatus = async (c, status) => {
    try { const { data } = await api.patch(`/checkin/${c._id}/status`, { status }); setRows((rs) => rs.map((r) => (r._id === c._id ? { ...r, status: data.status, checkedInAt: data.checkedInAt } : r))); }
    catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const remove = async (c) => {
    if (!window.confirm('Delete this check-in?')) return;
    try { await api.delete(`/checkin/${c._id}`); setRows((rs) => rs.filter((r) => r._id !== c._id)); } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };

  return (
    <>
      <div className="section__head"><h1>Web check-ins</h1></div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No web check-ins yet. Guests use /checkin with their booking reference and email.</p> : (
          <table className="table">
            <thead><tr><th>Booking</th><th>Guest</th><th>Stay</th><th>Arrival</th><th>Guests</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <Fragment key={c._id}>
                  <tr>
                    <td><b>{c.reference}</b></td>
                    <td>{c.booking?.guest?.name}<br /><small className="muted">{c.booking?.guest?.phone}</small></td>
                    <td>{c.booking?.room?.name}<br /><small className="muted">{fmtDate(c.booking?.checkIn)} to {fmtDate(c.booking?.checkOut)}</small></td>
                    <td>{c.arrivalTime || '-'}<br /><small className="muted">{c.comingFrom}</small></td>
                    <td>{c.guests.length}</td>
                    <td><span className={`badge badge--${BADGE[c.status]}`}>{c.status}</span></td>
                    <td className="actions">
                      <button className="link" onClick={() => setOpen(open === c._id ? null : c._id)}>{open === c._id ? 'Hide' : 'Details'}</button>
                      {c.status !== 'checked-in' && <button className="link" onClick={() => setStatus(c, 'checked-in')}>Mark checked in</button>}
                      {c.status === 'checked-in' && <button className="link" onClick={() => setStatus(c, 'submitted')}>Undo</button>}
                      <button className="link danger" onClick={() => remove(c)}>Delete</button>
                    </td>
                  </tr>
                  {open === c._id && (
                    <tr><td colSpan="7">
                      <small>
                        {c.guests.map((g, i) => <div key={i}>{i + 1}. <b>{g.name}</b>, age {g.age ?? '-'}{g.gender ? `, ${g.gender}` : ''}{g.idNumber ? ` · ${g.idType}: ${g.idNumber}` : ''}</div>)}
                        <div className="muted" style={{ marginTop: 6 }}>Purpose: {c.purpose || '-'} · Vehicle: {c.vehicle || '-'} · Emergency: {c.emergencyName || '-'} {c.emergencyPhone}</div>
                        {c.requests && <div className="muted">Note: {c.requests}</div>}
                      </small>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
