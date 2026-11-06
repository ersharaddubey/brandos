import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api.js';

const Auth = createContext();
const useAuth = () => useContext(Auth);

function Stars() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d'); let id, S = [];
    const fit = () => { c.width = innerWidth; c.height = innerHeight; S = Array.from({ length: 130 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.3 + .2, v: Math.random() * .2 + .04 })); };
    const draw = () => { x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#fff'; S.forEach(s => { s.y = (s.y + s.v) % c.height; x.globalAlpha = .25 + s.r / 2.2; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.3); x.fill(); }); id = requestAnimationFrame(draw); };
    fit(); draw(); addEventListener('resize', fit);
    return () => { cancelAnimationFrame(id); removeEventListener('resize', fit); };
  }, []);
  return <canvas ref={ref} className="sky" />;
}

function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav>
      <Link to="/" className="logo">COSMOLIVE</Link>
      <div>
        <Link to="/#pricing">Pricing</Link>
        {user ? <>
          <Link to="/dashboard">Dashboard</Link>
          {user.role === 'admin' && <Link to="/admin">Admin</Link>}
          <button className="link" onClick={logout}>Log out</button>
        </> : <><Link to="/login">Log in</Link><Link to="/register" className="btn sm">Sign up</Link></>}
      </div>
    </nav>
  );
}

function Home() {
  const [email, setEmail] = useState(''), [type, setType] = useState('explorer'), [msg, setMsg] = useState('');
  const join = async e => {
    e.preventDefault();
    try { await api('/waitlist', { method: 'POST', body: { email, type } }); setMsg('You are on the list. We will email you at launch.'); setEmail(''); }
    catch (err) { setMsg(err.message); }
  };
  return (
    <>
      <header className="wrap hero">
        <h1>The universe, live on every screen.</h1>
        <p className="sub">CosmoLive turns any TV, laptop or VR headset into a 3D observatory, and gives satellite investors a live view of the assets they fund.</p>
        <div><Link className="btn" to="/register">Create free account</Link><a className="btn ghost" href="#join">Join early access</a></div>
      </header>
      <section className="wrap">
        <h2>Two problems, one engine</h2>
        <div className="grid">
          <div className="card"><h3>Deep space is locked away</h3><p>JWST and Gaia data sit in academic archives while telescopes cost $1k to $10k.</p></div>
          <div className="card"><h3>Satellites are a black box</h3><p>Investors receive a static PDF each month instead of live health, yield and revenue.</p></div>
          <div className="card"><h3>CosmoLive connects both</h3><p>One WebGL and WebXR app for astronomy data and real-time satellite tracking.</p></div>
        </div>
      </section>
      <section className="wrap" id="pricing">
        <h2>Pricing</h2>
        <div className="grid">
          <div className="card"><h3>Explorer</h3><p className="price">$9.99<small>/mo Pro</small></p><p>Free 3D explorer. Pro adds 4K/8K TV mode, VR, AI contrast boost and full Time Machine.</p></div>
          <div className="card hl"><h3>Operator</h3><p className="price">$2,500+<small>/mo per cluster</small></p><p>Branded investor portal with live orbit, health and yield metrics.</p></div>
          <div className="card"><h3>Institution</h3><p className="price">Annual<small> license</small></p><p>For schools, universities, planetariums and observatories.</p></div>
        </div>
      </section>
      <section className="wrap" id="join">
        <form className="card center" onSubmit={join}>
          <h2>Join early access</h2>
          <div className="row">
            <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <select value={type} onChange={e => setType(e.target.value)}><option value="explorer">Space fan</option><option value="operator">Satellite operator</option><option value="institution">School or institution</option></select>
            <button className="btn">Notify me</button>
          </div>
          <p className="note">{msg}</p>
        </form>
      </section>
      <footer>© 2026 CosmoLive</footer>
    </>
  );
}

function AuthForm({ mode }) {
  const { login } = useAuth(), nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault();
    try { const d = await api('/auth/' + mode, { method: 'POST', body: f }); login(d); nav('/dashboard'); }
    catch (x) { setErr(x.message); }
  };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <div className="wrap narrow">
      <form className="card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        {mode === 'register' && <input required placeholder="Name" value={f.name} onChange={set('name')} />}
        <input type="email" required placeholder="Email" value={f.email} onChange={set('email')} />
        <input type="password" required minLength={6} placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} />
        {err && <p className="err">{err}</p>}
        <button className="btn">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
    </div>
  );
}

function Spark({ data }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), pts = data.map((v, i) => `${(i / (data.length - 1)) * 300},${60 - (v / max) * 55}`).join(' ');
  return <svg viewBox="0 0 300 60" className="spark"><polyline points={pts} fill="none" stroke="var(--ac)" strokeWidth="2" /></svg>;
}

function Dashboard() {
  const [sats, setSats] = useState([]), [id, setId] = useState(''), [t, setT] = useState(null), [hist, setHist] = useState([]), [err, setErr] = useState('');
  useEffect(() => { api('/satellites').then(d => { setSats(d); if (d[0]) setId(d[0]._id); }).catch(e => setErr(e.message)); }, []);
  useEffect(() => {
    if (!id) return; setHist([]); let on = true;
    const tick = () => api(`/satellites/${id}/telemetry`).then(d => { if (!on) return; setT(d); setHist(h => [...h.slice(-39), d.solarW]); }).catch(e => setErr(e.message));
    tick(); const iv = setInterval(tick, 2000); return () => { on = false; clearInterval(iv); };
  }, [id]);
  const M = ({ l, v }) => <div className="m"><small>{l}</small><b>{v}</b></div>;
  return (
    <div className="wrap">
      <h2>Live telemetry</h2>
      {err && <p className="err">{err}</p>}
      {!sats.length && !err && <p className="note">No satellites yet. An admin can add one.</p>}
      <select value={id} onChange={e => setId(e.target.value)}>{sats.map(s => <option key={s._id} value={s._id}>{s.name} · {s.operator}</option>)}</select>
      {t && <>
        <p className={t.status === 'Nominal' ? 'ok' : 'warn'}>● {t.status} · {new Date(t.time).toLocaleTimeString()}</p>
        <div className="dash">
          <M l="Position" v={`${t.lat}°, ${t.lon}°`} /><M l="Altitude" v={`${t.altitudeKm} km`} /><M l="Velocity" v={`${t.velocityKms} km/s`} />
          <M l="Inclination" v={`${t.inclination}°`} /><M l="Orbit period" v={`${t.periodMin} min`} /><M l="Solar output" v={`${t.solarW} W`} />
          <M l="Battery" v={`${t.batteryPct}%`} /><M l="Reaction wheel" v={`${t.reactionWheelRpm} RPM`} /><M l="Utilization" v={`${t.utilizationPct}%`} />
          <M l="Revenue / hour" v={`$${t.revenuePerHour}`} /><M l="Downlink" v={`${t.downlinkGB} GB`} /><M l="Lifespan left" v={`${t.lifespanYears} yrs`} />
        </div>
        <div className="card"><small>Solar output, last 80 seconds</small><Spark data={hist} /></div>
        <p className="note">Telemetry is simulated until a real operator feed is connected.</p>
      </>}
    </div>
  );
}

function Admin() {
  const [wl, setWl] = useState([]), [sats, setSats] = useState([]), [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', operator: '', altitudeKm: 550, inclination: 53, lifespanYears: 4, revenuePerHour: 150 });
  const load = () => { api('/waitlist').then(setWl).catch(e => setErr(e.message)); api('/satellites').then(setSats).catch(() => {}); };
  useEffect(load, []);
  const add = async e => { e.preventDefault(); try { await api('/satellites', { method: 'POST', body: f }); setF({ ...f, name: '', operator: '' }); load(); } catch (x) { setErr(x.message); } };
  const set = k => e => setF({ ...f, [k]: e.target.type === 'number' ? +e.target.value : e.target.value });
  return (
    <div className="wrap">
      <h2>Admin</h2>{err && <p className="err">{err}</p>}
      <form className="card" onSubmit={add}>
        <h3>Add satellite</h3>
        <div className="row"><input required placeholder="Name" value={f.name} onChange={set('name')} /><input required placeholder="Operator" value={f.operator} onChange={set('operator')} /></div>
        <div className="row">
          {[['altitudeKm', 'Altitude km'], ['inclination', 'Inclination °'], ['lifespanYears', 'Lifespan yrs'], ['revenuePerHour', 'Revenue $/hr']].map(([k, l]) => <label key={k}><small>{l}</small><input type="number" step="any" value={f[k]} onChange={set(k)} /></label>)}
        </div>
        <button className="btn">Add satellite</button>
      </form>
      <div className="card"><h3>Satellites ({sats.length})</h3>{sats.map(s => <p key={s._id}>{s.name} · {s.operator} · {s.altitudeKm} km</p>)}</div>
      <div className="card sw"><h3>Waitlist ({wl.length})</h3>
        <table><thead><tr><th>Email</th><th>Type</th><th>Date</th></tr></thead>
          <tbody>{wl.map(w => <tr key={w._id}><td>{w.email}</td><td>{w.type}</td><td>{new Date(w.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
        {!wl.length && <p className="note">No signups yet. Signups from the home page show up here.</p>}
      </div>
    </div>
  );
}

const Guard = ({ children, admin }) => {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

export default function App() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const login = d => { localStorage.setItem('token', d.token); setUser(d.user); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return (
    <Auth.Provider value={{ user, ready, login, logout }}>
      <Stars /><Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </Auth.Provider>
  );
}
