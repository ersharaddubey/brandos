import { useState } from 'react';
import { api, auth } from '../api.js';
import Logo from '../components/Logo.jsx';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'reset') { await api.resetPassword(resetToken, password); setError('Password updated. Sign in with your new password.'); setMode('login'); window.history.replaceState({}, '', window.location.pathname); setPassword(''); setBusy(false); return; }
      const result = mode === 'signup'
        ? await api.signup({ name, email: username.trim(), organizationName, password })
        : await api.login(username.trim(), password);
      const { token } = result;
      auth.save(token);
      onSuccess();
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection and try again.' : err.message);
      setShakeKey((k) => k + 1);
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} key={shakeKey} data-shake={shakeKey > 0 ? 'on' : 'off'}>
        <Logo size={52} className="login-logo" />
        <h1>brandstudio</h1>
        <p className="login-sub">{mode === 'signup' ? 'Create your company workspace.' : mode === 'reset' ? 'Choose a new password for your account.' : 'Sign in to your BrandStudio workspace.'}</p>

        {mode === 'signup' && <><label htmlFor="signup-name">Your name</label><input id="signup-name" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required /><label htmlFor="signup-org">Organization name</label><input id="signup-org" value={organizationName} onChange={e=>setOrganizationName(e.target.value)} required /></>}
        {mode !== 'reset' && <label htmlFor="login-user">{mode === 'signup' ? 'Work email' : 'Work email or admin username'}</label>}
        {mode !== 'reset' && <input
          id="login-user"
          type={mode === 'signup' ? 'email' : 'text'}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={mode === 'signup' ? 3 : undefined}
        />}

        <label htmlFor="login-pass">Password</label>
        <div className="login-pass">
          <input
            id="login-pass"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode !== 'login' ? 12 : undefined}
          />
          <button type="button" className="login-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <p className="login-error" role="alert" aria-live="polite">{error}</p>

        <button type="submit" className="primary login-submit" disabled={busy || (mode !== 'reset' && !username) || !password}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create workspace' : mode === 'reset' ? 'Update password' : 'Sign in'}
        </button>
        {mode !== 'reset' && <button type="button" className="text-button" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login' ? 'Create an organization account' : 'Already have an account? Sign in'}</button>}
        {mode==='login' && <button type="button" className="text-button" onClick={async()=>{if(!username.trim()){setError('Enter your work email first.');return;} try { await api.forgotPassword(username.trim()); setError('If the account exists, reset instructions will be sent.'); } catch(e){setError(e.message);} }}>Forgot password?</button>}
      </form>
    </div>
  );
}
