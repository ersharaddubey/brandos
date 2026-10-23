import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
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
import WorkflowBuilder from './pages/WorkflowBuilder.jsx';
import Logo from './components/Logo.jsx';

export default function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    const load = () => api.health().then(setHealth).catch(() => setHealth(null));
    load();
    const t = setInterval(load, 15001);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand-row">
          <Logo size={32} />
          <div>
            <p className="brand">Creative Identity</p>
            <p className="tag">Create once · Lock identity</p>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/identities">Identity Lock</NavLink>
          <NavLink to="/prompts">Prompt OS</NavLink>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/check">Check & Analysis</NavLink>
          <NavLink to="/assets">Asset Bank</NavLink>
          <NavLink to="/open-shelf">Open Shelf</NavLink>
          <NavLink to="/recycle">Recycle Bin</NavLink>
          <NavLink to="/integrations">Integrations</NavLink>
          <NavLink to="/workflow-builder">Workflow Builder</NavLink>
        </nav>
        <div className="status">
          <div><span className={'dot' + (health ? ' on' : '')} />API {health ? 'online' : 'offline'}</div>
          <div><span className={'dot' + (health?.ollama ? ' on' : '')} />Vision {health?.ollama ? 'online' : 'offline'}</div>
          <div className="small">generator: {health?.generator || '-'}</div>
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
          <Route path="/workflow-builder" element={<WorkflowBuilder />} />
          <Route path="/public" element={<OpenShelf />} />
        </Routes>
      </main>
    </div>
  );
}
