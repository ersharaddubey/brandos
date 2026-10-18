import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/account';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { nav(from, { replace: true }); return null; }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.phone.trim()) { setError('Phone number is required'); return; }
    setBusy(true);
    try { await register(form); nav(from, { replace: true }); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create account" text="Register with your name, email and phone to unlock room prices and book your stay."
      footer={<>Already have an account? <Link className="font-medium text-gold-700 hover:underline" to="/login" state={{ from }}>Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <label className="block"><span className="lbl">Full name</span><input className="inp" value={form.name} onChange={set('name')} required autoComplete="name" /></label>
        <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label className="block"><span className="lbl">Phone number</span><input className="inp" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" placeholder="+91 98765 43210" /></label>
        <label className="block"><span className="lbl">Password</span><input className="inp" type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" /></label>
        <button className="bt-gold w-full" disabled={busy}>{busy ? 'Creating account…' : 'Register and view prices'}</button>
      </form>
    </AuthShell>
  );
}
