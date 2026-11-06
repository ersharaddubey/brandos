import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const panel = { background: 'var(--panel, rgba(255,255,255,.04))', border: '1px solid var(--line, rgba(255,255,255,.12))', borderRadius: 14, padding: 16 };
const btn = { border: '1px solid var(--line, rgba(255,255,255,.18))', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', background: 'var(--accent-soft, rgba(10,132,255,.12))', color: 'inherit' };
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--line, rgba(255,255,255,.18))', background: 'transparent', color: 'inherit', boxSizing: 'border-box' };
const statusColor = (s) => s === 'approved' ? '#30c77a' : s === 'rejected' ? '#ff6b6b' : '#e6b450';

export default function Autonomy() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', objective: '', agentKey: 'ceo', risk: 'medium' });
  const load = useCallback(async () => {
    try { setData(await api.autonomy.get()); setError(''); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createTask(e) {
    e.preventDefault(); setBusy(true);
    try { await api.autonomy.createTask(form); setForm({ title: '', objective: '', agentKey: 'ceo', risk: 'medium' }); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function decide(id, action) {
    setBusy(true);
    try { await api.autonomy.decide(id, action); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function toggleAgent(agent) {
    setBusy(true);
    try { await api.autonomy.toggleAgent(agent.key, agent.status === 'ready' ? 'pause' : 'resume'); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="page">
    <div className="page-header">
      <div><p className="eyebrow">COMPANY OPERATING SYSTEM</p><h1>Autonomous AI OS</h1>
        <p className="muted">A supervised multi-agent workspace: plan, delegate, review and improve.</p></div>
      <button style={btn} onClick={load}>Refresh</button>
    </div>
    {error && <div role="alert" style={{ ...panel, borderColor: '#ff6b6b', marginBottom: 14 }}>{error}</div>}
    <div style={{ ...panel, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Operating mode: Human approval</strong><span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 20, background: 'rgba(48,199,122,.12)', color: '#30c77a' }}>GUARDED</span>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>Execution adapters: disabled</span>
      </div>
      <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>Agents can organize work and create proposals. Approving a task records authorization only; it does not run code, spend money, deploy services or send messages.</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
      {[['Agents', data?.counts?.agents ?? '—'], ['Awaiting approval', data?.counts?.proposed ?? '—'], ['Approved', data?.counts?.approved ?? '—'], ['Rejected', data?.counts?.rejected ?? '—']].map(([k,v]) =>
        <div key={k} style={panel}><div className="muted" style={{ fontSize: 12 }}>{k}</div><div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{v}</div></div>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16, alignItems: 'start' }}>
      <section style={panel}>
        <h2 style={{ marginTop: 0 }}>Create a work proposal</h2>
        <form onSubmit={createTask} style={{ display: 'grid', gap: 10 }}>
          <label>Task title<input style={input} maxLength={160} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Research SaaS customer segments" /></label>
          <label>Objective<textarea style={{ ...input, minHeight: 95, resize: 'vertical' }} maxLength={3000} required value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Describe the outcome, constraints and expected deliverable." /></label>
          <label>Assigned agent<select style={input} value={form.agentKey} onChange={e => setForm({ ...form, agentKey: e.target.value })}>{(data?.agents || []).filter(a => a.status === 'ready').map(a => <option key={a.key} value={a.key}>{a.name}</option>)}</select></label>
          <label>Risk level<select style={input} value={form.risk} onChange={e => setForm({ ...form, risk: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <button style={btn} disabled={busy || !data?.agents?.some(a => a.status === 'ready')}>Submit proposal for review</button>
        </form>
      </section>
      <section style={panel}>
        <h2 style={{ marginTop: 0 }}>Agent roster</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {(data?.agents || []).map(a => <div key={a.key} style={{ paddingBottom: 10, borderBottom: '1px solid var(--line, rgba(255,255,255,.1))' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><strong>{a.name}</strong><span className="muted" style={{ fontSize: 12 }}>{a.role}</span><span style={{ marginLeft: 'auto', fontSize: 12, color: a.status === 'ready' ? '#30c77a' : '#e6b450' }}>{a.status}</span></div>
            <p className="muted" style={{ fontSize: 13, margin: '5px 0 8px' }}>{a.description}</p>
            <button style={btn} disabled={busy} onClick={() => toggleAgent(a)}>{a.status === 'ready' ? 'Pause agent' : 'Resume agent'}</button>
          </div>)}
        </div>
      </section>
    </div>
    <section style={{ ...panel, marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Work queue & approvals</h2>
      {!data?.tasks?.length && <p className="muted">No proposals yet. Create the first task above.</p>}
      <div style={{ display: 'grid', gap: 10 }}>
        {(data?.tasks || []).map(t => <article key={t._id} style={{ border: '1px solid var(--line, rgba(255,255,255,.12))', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{t.title}</strong><span style={{ color: statusColor(t.status), fontSize: 12, textTransform: 'uppercase' }}>{t.status}</span><span className="muted" style={{ fontSize: 12 }}>Risk: {t.risk}</span></div>
          <p className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{t.objective}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span className="muted" style={{ fontSize: 12 }}>Agent: {data?.agents?.find(a => a.key === t.agentKey)?.name || t.agentKey}</span>
            {t.status === 'proposed' && <><button style={btn} disabled={busy} onClick={() => decide(t._id, 'approve')}>Approve proposal</button><button style={btn} disabled={busy} onClick={() => decide(t._id, 'reject')}>Reject</button></>}
          </div>
          {t.approvalNote && <p className="muted" style={{ fontSize: 12 }}>Review note: {t.approvalNote}</p>}
        </article>)}
      </div>
    </section>
    <section style={{ ...panel, marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Safety policy</h2>
      <ul className="muted" style={{ paddingLeft: 20 }}>{(data?.policy || []).map(p => <li key={p} style={{ marginBottom: 5 }}>{p}</li>)}</ul>
    </section>
  </div>;
}
