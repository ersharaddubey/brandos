import { useEffect, useState, useRef } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api, auth } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Identities from './pages/Identities.jsx';
import IdentityDetail from './pages/IdentityDetail.jsx';
import PromptOS from './pages/PromptOS.jsx';
import Studio from './pages/Studio.jsx';
import AssetBank from './pages/AssetBank.jsx';
import OpenShelf from './pages/OpenShelf.jsx';
import RecycleBin from './pages/RecycleBin.jsx';
import Check from './pages/Check.jsx';
import Integrations from './pages/Integrations.jsx';
import Login from './pages/Login.jsx';
import Logo from './components/Logo.jsx';
import Autonomy from './pages/Autonomy.jsx';

function AppShell({ onLogout }) {
  const [health, setHealth] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const stageRef = useRef(null);

  useEffect(() => {
    const load = () => api.health().then(setHealth).catch(() => setHealth(null));
    load();
    const t = setInterval(load, 15002);
    return () => clearInterval(t);
  }, []);

  /* Parallax: mouse + scroll move depth layers at different speeds */
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--px', x.toFixed(4));
        root.style.setProperty('--py', y.toFixed(4));
      });
    };
    const onScroll = () => {
      const s = window.scrollY || 0;
      root.style.setProperty('--ps', Math.min(s / 600, 2).toFixed(4));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Close drawer on route change / resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeNav = () => setNavOpen(false);

  return (
    <div className={'layout parallax-app' + (navOpen ? ' nav-open' : '')} ref={stageRef}>
      <div className="parallax-stage" aria-hidden>
        <div className="plx plx-far" />
        <div className="plx plx-mid" />
        <div className="plx plx-near" />
        <div className="plx plx-grid" />
      </div>
      <button
        type="button"
        className="nav-toggle"
        aria-label={navOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setNavOpen((v) => !v)}
      >
        {navOpen ? '✕' : '☰'}
      </button>
      <div className="nav-backdrop" onClick={closeNav} aria-hidden />
      <aside className="side">
        <div className="brand-row">
          <Logo size={32} />
          <div>
            <p className="brand">brandstudio</p>
            <p className="tag">Create once · Lock identity</p>
          </div>
        </div>
        <nav onClick={closeNav}>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/identities">Identity Lock</NavLink>
          <NavLink to="/prompts">Prompt OS</NavLink>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/check">Check & Analysis</NavLink>
          <NavLink to="/assets">Asset Bank</NavLink>
          <NavLink to="/open-shelf">Public Assets</NavLink>
          <NavLink to="/recycle">Recycle Bin</NavLink>
          <NavLink to="/integrations">Integrations</NavLink>
          <NavLink to="/autonomy">Autonomous AI OS</NavLink>
        </nav>
        <div className="status">
          <div><span className={'dot' + (health ? ' on' : '')} />API {health ? 'online' : 'offline'}</div>
          <div><span className={'dot' + (health?.ollama ? ' on' : '')} />Vision {health?.ollama ? 'online' : 'offline'}</div>
          <div className="small">generator: {health?.generator || '-'}</div>
          <button type="button" className="ghost logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/identities" element={<Identities />} />
          <Route path="/identities/:id" element={<IdentityDetail />} />
          <Route path="/prompts" element={<PromptOS />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/check" element={<Check />} />
          <Route path="/assets" element={<AssetBank />} />
          <Route path="/open-shelf" element={<OpenShelf />} />
          <Route path="/recycle" element={<RecycleBin />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/autonomy" element={<Autonomy />} />
          <Route path="/public" element={<OpenShelf />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(!!auth.token());

  // Saved token valid hai ya nahi — server se verify
  useEffect(() => {
    if (!auth.token()) { setChecking(false); return; }
    api.me().then(() => setAuthed(true)).catch(() => { auth.clear(); setAuthed(false); }).finally(() => setChecking(false));
  }, []);

  // Kisi bhi API call par 401 aaye to login par wapas
  useEffect(() => {
    const out = () => setAuthed(false);
    window.addEventListener('brandstudio:logout', out);
    return () => window.removeEventListener('brandstudio:logout', out);
  }, []);

  const logout = () => { auth.clear(); setAuthed(false); };

  if (checking) return <div className="login-page" aria-busy="true" />;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <AppShell onLogout={logout} />;
}
