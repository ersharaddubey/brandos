import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { nav(from, { replace: true }); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await login(email, password);
      nav(u.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" text="Log in to see prices, your bookings, food orders and invoices."
      footer={<>New here? <Link className="font-medium text-gold-700 hover:underline" to="/register" state={{ from }}>Create an account</Link> to see prices.</>}>
      <form onSubmit={submit} className="space-y-5">
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <label className="block"><span className="lbl">Email</span><input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label className="block"><span className="lbl">Password</span><input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" /></label>
        <button className="bt-gold w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form>
    </AuthShell>
  );
}
