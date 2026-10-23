import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import api, { errMsg, fmtDate } from '../api';
import PageTop from '../components/PageTop';

const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'Other'];
const PURPOSE = ['Holiday', 'Work from hills', 'Workation / remote work', 'Adventure', 'Other'];
const blank = (name = '') => ({ name, age: '', gender: '', idType: 'Aadhaar', idNumber: '' });

export default function CheckIn() {
  const [q, setQ] = useState({ reference: '', email: '' });
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({ arrivalTime: '', comingFrom: '', vehicle: '', purpose: 'Holiday', emergencyName: '', emergencyPhone: '', requests: '' });
  const [guests, setGuests] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const lookup = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { data } = await api.post('/checkin/lookup', q);
      setInfo(data);
      const ex = data.existing;
      if (ex) {
        setF({ arrivalTime: ex.arrivalTime || '', comingFrom: ex.comingFrom || '', vehicle: ex.vehicle || '', purpose: ex.purpose || 'Holiday', emergencyName: ex.emergencyName || '', emergencyPhone: ex.emergencyPhone || '', requests: ex.requests || '' });
        setGuests(ex.guests?.length ? ex.guests : [blank(data.guestName)]);
      } else {
        const n = Math.max(1, (data.adults || 1) + (data.children || 0));
        setGuests(Array.from({ length: n }, (_, i) => blank(i === 0 ? data.guestName : '')));
      }
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const setG = (i, k, v) => setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/checkin', { ...q, ...f, guests, agreed });
      setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="wrap max-w-xl pb-28 pt-44 text-center">
      <div className="surface p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/50 text-gold-700"><Check size={32} /></span>
        <h1 className="mt-5 text-4xl">Web check-in done</h1>
        <p className="mt-3 text-ink/80">Thank you, {info?.guestName}. Your details for booking <b>{info?.reference}</b> are with us. Just show your ID when you arrive.</p>
        <Link to="/cafe" className="bt-line mt-6">Order from our cafe</Link>
      </div>
    </div>
  );

  if (!info) return (
    <>
      <PageTop eyebrow="Web check-in" title="Check in before you arrive" text="Enter your booking reference and the email you booked with." />
      <form onSubmit={lookup} className="wrap max-w-md pb-24">
        <div className="surface space-y-4 p-7">
          <label className="block"><span className="lbl">Booking reference</span><input className="inp font-mono uppercase tracking-widest" value={q.reference} onChange={(e) => setQ({ ...q, reference: e.target.value })} required /></label>
          <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={q.email} onChange={(e) => setQ({ ...q, email: e.target.value })} required /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="bt-gold w-full" disabled={busy}>{busy ? 'Checking…' : 'Find my booking'}</button>
          <p className="text-center text-xs text-ink/65">No booking yet? <Link className="text-gold-700 hover:underline" to="/stay#book">Reserve your stay</Link></p>
        </div>
      </form>
    </>
  );

  return (
    <>
      <PageTop eyebrow="Web check-in" title={`Welcome, ${info.guestName}`} text={`${info.room || 'Your room'} · ${fmtDate(info.checkIn)} to ${fmtDate(info.checkOut)} · Booking ${info.reference}`} />
      <form onSubmit={submit} className="wrap max-w-3xl space-y-6 pb-24">
        {info.existing && <p className="rounded-2xl bg-gold-50 px-5 py-3 text-sm text-ink/85">You already sent your check-in details. You can update them below until we mark you checked in.</p>}
        <div className="surface space-y-4 p-7">
          <h2 className="text-2xl">Arrival</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="lbl">Expected arrival time</span><input className="inp" type="time" value={f.arrivalTime} onChange={(e) => setF({ ...f, arrivalTime: e.target.value })} /></label>
            <label className="block"><span className="lbl">Coming from (city)</span><input className="inp" value={f.comingFrom} onChange={(e) => setF({ ...f, comingFrom: e.target.value })} /></label>
            <label className="block"><span className="lbl">Vehicle number (optional)</span><input className="inp" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} /></label>
            <label className="block"><span className="lbl">Purpose of visit</span><select className="inp" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{PURPOSE.map((p) => <option key={p}>{p}</option>)}</select></label>
          </div>
        </div>

        <div className="surface space-y-5 p-7">
          <div className="flex items-center justify-between"><h2 className="text-2xl">Guests ({guests.length})</h2>
            <button type="button" className="bt-line bt-sm" onClick={() => setGuests((g) => [...g, blank()])}>Add guest</button></div>
          {guests.map((g, i) => (
            <div key={i} className="rounded-2xl border border-ink/10 p-4">
              <div className="mb-3 flex items-center justify-between text-sm font-medium"><span>Guest {i + 1}{i === 0 ? ' (primary)' : ''}</span>
                {guests.length > 1 && <button type="button" className="text-red-600 hover:underline" onClick={() => setGuests((gs) => gs.filter((_, j) => j !== i))}>Remove</button>}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="lbl">Full name</span><input className="inp" value={g.name} onChange={(e) => setG(i, 'name', e.target.value)} required /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="lbl">Age</span><input className="inp" type="number" min="0" max="120" value={g.age} onChange={(e) => setG(i, 'age', e.target.value)} required /></label>
                  <label className="block"><span className="lbl">Gender</span><select className="inp" value={g.gender} onChange={(e) => setG(i, 'gender', e.target.value)}><option value="">-</option><option>Female</option><option>Male</option><option>Other</option></select></label>
                </div>
                <label className="block"><span className="lbl">ID type {Number(g.age) >= 18 ? '*' : '(adults)'}</span><select className="inp" value={g.idType} onChange={(e) => setG(i, 'idType', e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
                <label className="block"><span className="lbl">ID number {Number(g.age) >= 18 ? '*' : ''}</span><input className="inp" value={g.idNumber} onChange={(e) => setG(i, 'idNumber', e.target.value)} required={Number(g.age) >= 18} /></label>
              </div>
            </div>
          ))}
          <p className="text-xs text-ink/65">Your ID details are used only for guest registration at the property and are visible to our staff only.</p>
        </div>

        <div className="surface space-y-4 p-7">
          <h2 className="text-2xl">Emergency contact and requests</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="lbl">Contact name</span><input className="inp" value={f.emergencyName} onChange={(e) => setF({ ...f, emergencyName: e.target.value })} /></label>
            <label className="block"><span className="lbl">Contact phone</span><input className="inp" type="tel" value={f.emergencyPhone} onChange={(e) => setF({ ...f, emergencyPhone: e.target.value })} /></label>
          </div>
          <label className="block"><span className="lbl">Anything we should know? (optional)</span><textarea className="inp" rows="2" value={f.requests} onChange={(e) => setF({ ...f, requests: e.target.value })} /></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I confirm the details above are correct and I will carry the original ID proofs for verification.</label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="bt-gold w-full" disabled={busy || !agreed}>{busy ? 'Sending…' : info.existing ? 'Update check-in' : 'Complete web check-in'}</button>
        </div>
      </form>
    </>
  );
}
