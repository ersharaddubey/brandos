import { Fragment, useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../api';

const STATUSES = ['new', 'shortlisted', 'rejected'];
const BADGE = { new: 'pending', shortlisted: 'confirmed', rejected: 'cancelled' };

export default function VolunteersAdmin() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => { api.get('/volunteers/admin/all').then((r) => setRows(r.data)).catch((e) => setMsg({ err: true, text: errMsg(e) })).finally(() => setLoading(false)); }, []);

  const setStatus = async (v, status) => {
    try { await api.patch(`/volunteers/${v._id}/status`, { status }); setRows((rs) => rs.map((r) => (r._id === v._id ? { ...r, status } : r))); }
    catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const resume = async (v) => {
    try {
      const { data } = await api.get(`/volunteers/${v._id}/resume`, { responseType: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(data); a.download = v.resume?.filename || 'resume'; a.click();
    } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const remove = async (v) => {
    if (!window.confirm(`Delete the application from ${v.name}?`)) return;
    try { await api.delete(`/volunteers/${v._id}`); setRows((rs) => rs.filter((r) => r._id !== v._id)); } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const shown = rows.filter((r) => !filter || r.status === filter);

  return (
    <>
      <div className="section__head"><h1>Volunteer and collaboration requests</h1></div>
      <div className="tabs">{['', ...STATUSES].map((s) => <button key={s || 'all'} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s || 'All'}</button>)}</div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading…</p> : shown.length === 0 ? <p className="muted">No applications yet. The form is at /volunteer.</p> : (
          <table className="table">
            <thead><tr><th>Applicant</th><th>Followers</th><th>Links</th><th>Applied</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((v) => (
                <Fragment key={v._id}>
                  <tr>
                    <td><b>{v.name}</b>, {v.age}<br /><small className="muted">{v.email}</small></td>
                    <td>{v.followers.toLocaleString('en-IN')}</td>
                    <td><small>{v.instagram && <a href={v.instagram.startsWith('http') ? v.instagram : `https://${v.instagram}`} target="_blank" rel="noreferrer">Instagram</a>}{v.instagram && v.youtube ? ' · ' : ''}{v.youtube && <a href={v.youtube.startsWith('http') ? v.youtube : `https://${v.youtube}`} target="_blank" rel="noreferrer">YouTube</a>}</small></td>
                    <td>{fmtDate(v.createdAt)}</td>
                    <td><select value={v.status} onChange={(e) => setStatus(v, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select> <span className={`badge badge--${BADGE[v.status]}`}>{v.status}</span></td>
                    <td className="actions"><button className="link" onClick={() => setOpen(open === v._id ? null : v._id)}>{open === v._id ? 'Hide' : 'Read'}</button><button className="link" onClick={() => resume(v)}>Resume</button><button className="link danger" onClick={() => remove(v)}>Delete</button></td>
                  </tr>
                  {open === v._id && <tr><td colSpan="6"><small><b>Skills:</b> {v.skills}<br /><b>Why select:</b> {v.why}</small></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
