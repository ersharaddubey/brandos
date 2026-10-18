import './admin.css';
import { useState } from 'react';
import { NavLink, Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';

const links = [
  ['/admin', 'Dashboard', true],
  ['/admin/bookings', 'Bookings'],
  ['/admin/hotels', 'Rooms'],
  ['/admin/offers', 'Offers'],
  ['/admin/food', 'Food menu'],
  ['/admin/gallery', 'Gallery'],
  ['/admin/videos', 'Home videos'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/settings', 'Site settings'],
];

export default function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  if (!ready) return <div className="page"><p className="muted">Loading…</p></div>;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin">
      <aside className={`admin__side ${open ? 'is-open' : ''}`}>
        <div className="brand">{settings.siteName}</div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="admin__side-foot">
          <Link to="/" target="_blank">View website</Link>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="admin__main">
        <header className="admin__top">
          <button className="admin__burger" aria-label="Menu" onClick={() => setOpen(!open)}>Menu</button>
          <span className="muted">Signed in as {user.name}</span>
        </header>
        <div className="admin__content"><Outlet /></div>
      </div>
    </div>
  );
}
