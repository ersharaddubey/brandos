import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, inr } from '../api';

const STATUSES = ['placed', 'preparing', 'served', 'paid', 'cancelled'];
const BADGE = { placed: 'pending', preparing: 'pending', served: 'completed', paid: 'confirmed', cancelled: 'cancelled' };
const MODES = ['', 'Cash', 'UPI', 'Card'];

export default function CafeOrdersAdmin() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = () => { setLoading(true); api.get('/cafe/admin/all').then((r) => setRows(r.data)).catch((e) => setMsg({ err: true, text: errMsg(e) })).finally(() => setLoading(false)); };
  useEffect(load, []);

  const patch = async (o, body) => {
    try { const { data } = await api.patch(`/cafe/${o._id}/status`, body); setRows((rs) => rs.map((r) => (r._id === o._id ? data : r))); }
    catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const remove = async (o) => {
    if (!window.confirm(`Delete order ${o.orderNo}?`)) return;
    try { await api.delete(`/cafe/${o._id}`); setRows((rs) => rs.filter((r) => r._id !== o._id)); } catch (e) { setMsg({ err: true, text: errMsg(e) }); }
  };
  const shown = rows.filter((r) => !filter || r.status === filter);

  return (
    <>
      <div className="section__head"><h1>Cafe orders</h1></div>
      <div className="tabs">{['', ...STATUSES].map((s) => <button key={s || 'all'} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s || 'All'}</button>)}</div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div className="card scroll">
        {loading ? <p className="muted">Loading…</p> : shown.length === 0 ? <p className="muted">No orders yet. Guests order at /cafe.</p> : (
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
            <tbody>
              {shown.map((o) => (
                <Fragment key={o._id}>
                  <tr>
                    <td><b>{o.orderNo}</b><br /><small className="muted">{new Date(o.createdAt).toLocaleString('en-IN')}</small></td>
                    <td>{o.customer.name}<br /><small className="muted">{o.customer.phone} · {o.orderType}{o.place ? ` ${o.place}` : ''}</small></td>
                    <td><small>{o.items.map((l) => `${l.name} × ${l.qty}`).join(', ')}{o.note ? ` (Note: ${o.note})` : ''}</small></td>
                    <td>{inr(o.total)}</td>
                    <td><select value={o.status} onChange={(e) => patch(o, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select> <span className={`badge badge--${BADGE[o.status]}`}>{o.status}</span></td>
                    <td><select value={o.paymentMode || ''} onChange={(e) => patch(o, { paymentMode: e.target.value })}>{MODES.map((m) => <option key={m} value={m}>{m || '-'}</option>)}</select></td>
                    <td className="actions"><Link className="link" to={`/cafe-bill/${o.orderNo}`} target="_blank">Bill</Link><button className="link danger" onClick={() => remove(o)}>Delete</button></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
