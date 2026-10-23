import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fmtDate, inr } from '../api';

// All bills in one place: room invoices + Hi Strangers Cafe bills, with totals.
export default function BillingAdmin() {
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/billing/admin', { params: { type, from: from || undefined, to: to || undefined } })
      .then((r) => setData(r.data)).catch((e) => setMsg({ err: true, text: errMsg(e) })).finally(() => setLoading(false));
  };
  useEffect(load, [type, from, to]);

  const t = data.totals || {};
  const cards = [['Total billed', t.billed], ['Room invoices', t.room], ['Cafe bills', t.cafe], ['Food (all bills)', t.foodAll]];
  const csv = () => {
    const head = ['Type', 'Bill no', 'Name', 'Phone', 'Date', 'Details', 'Amount', 'Status'];
    const lines = data.rows.map((r) => [r.kind, r.ref, r.name, r.phone, new Date(r.date).toISOString().slice(0, 10), r.detail, r.amount, r.status]);
    const text = [head, ...lines].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = 'bills.csv'; a.click();
  };

  return (
    <>
      <div className="section__head"><h1>Billing</h1><button className="btn btn--line btn--sm" onClick={csv} disabled={!data.rows.length}>Download CSV</button></div>
      <div className="tabs">{[['all', 'All bills'], ['room', 'Room invoices'], ['cafe', 'Cafe bills']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0 0 14px' }}>
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {(from || to) && <button className="link" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}
      </div>
      {msg && <div className={`notice ${msg.err ? 'notice--err' : 'notice--ok'}`}>{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
        {cards.map(([l, v]) => <div key={l} className="card"><small className="muted">{l}</small><h2 style={{ margin: '.2rem 0 0' }}>{inr(v)}</h2></div>)}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>Totals leave out cancelled bookings and orders. {t.bills ?? 0} bills counted.</p>
      <div className="card scroll">
        {loading ? <p className="muted">Loading…</p> : data.rows.length === 0 ? <p className="muted">No bills in this range.</p> : (
          <table className="table">
            <thead><tr><th>Bill</th><th>Name</th><th>Date</th><th>Details</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td><b>{r.ref}</b><br /><small className="muted">{r.kind === 'room' ? 'Room invoice' : 'Cafe bill'}</small></td>
                  <td>{r.name}<br /><small className="muted">{r.phone}</small></td>
                  <td>{fmtDate(r.date)}</td>
                  <td><small>{r.detail}</small></td>
                  <td><b>{inr(r.amount)}</b></td>
                  <td><span className={`badge badge--${r.status === 'cancelled' ? 'cancelled' : r.status === 'pending' || r.status === 'placed' || r.status === 'preparing' ? 'pending' : r.status === 'completed' || r.status === 'served' ? 'completed' : 'confirmed'}`}>{r.status}</span></td>
                  <td className="actions"><Link className="link" target="_blank" to={r.kind === 'room' ? `/invoice/${r.id}` : `/cafe-bill/${r.ref}`}>Open bill</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
