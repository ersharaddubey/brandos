import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { TourProvider, GuideBar, Tip } from '../components/Help.jsx';
import PageHeader from '../components/PageHeader.jsx';

/** Full product walkthrough — only on Dashboard */
const TOUR_STEPS = [
  {
    selector: '[data-tour="dash-stats"]',
    title: 'Dashboard',
    body: 'Live counts for identities, locks, prompts, and generations. Click any tile to jump to that area of Creative Identity.',
    why: '“One home screen for the whole workflow.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'How to use Creative Identity',
    body: 'Follow this path: Identity Lock → Prompt OS → Studio → Check & Analysis → Asset Bank (private) or Open Shelf (shared). Each line is a link.',
    why: '“Create once. Lock identity. Reuse everywhere.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'Identity Lock',
    body: 'Upload a reference. Types are only product, character, environment, or brand. Review the profile, then Lock. Choose Asset Bank or Open Shelf for the reference asset.',
    why: '“Locking freezes the profile so campaigns stay consistent.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'Prompt OS & Studio',
    body: 'Prompt OS stores private templates with variables like {{identity}}. Studio uses locked identities plus a campaign brief to build a JSON + English prompt or generate here.',
    why: '“Same identity, different campaigns — only the brief changes.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'Check & Analysis',
    body: 'Score a generated image against locked anchors, or analyse a photo into a structured prompt and generate freely.',
    why: '“Verify quality before you publish.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'Asset Bank, Open Shelf & Groups',
    body: 'Asset Bank is private storage. Open Shelf is shared. Groups are named “Company + type” (e.g. Creative Identity product). Default groups cannot be deleted. Deleting a custom group asks whether assets go public or to Recycle Bin (24 hours).',
    why: '“Private vs shared is always your choice.”',
  },
  {
    selector: '[data-tour="dash-flow"]',
    title: 'Recycle Bin',
    body: 'Items from deleted groups can land in Recycle Bin for 24 hours. Restore or permanently delete there. After 24 hours they are removed automatically.',
    why: '“Mistakes should be recoverable.”',
  },
];

const STAT_LINKS = {
  Identities: '/identities',
  Locked: '/identities',
  Prompts: '/prompts',
  Generations: '/studio',
  'Generated assets': '/assets',
  'Avg consistency': '/check',
};

function DashboardInner() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.stats().then(setS).catch((e) => setErr(e.message));
  }, []);

  const items = s && [
    ['Identities', s.identities],
    ['Locked', s.locked],
    ['Prompts', s.prompts],
    ['Generations', s.generations],
    ['Generated assets', s.generated],
    ['Avg consistency', s.avgScore ?? '-'],
  ];

  return (
    <>
      <h1>Creative Identity</h1>
      <p className="sub">
        Reference → Understand → Lock → Prompt → Generate → Check → Improve → Asset Bank / Open Shelf
      </p>
      <GuideBar showTour tourLabel="Start tour" />
      {err && <div className="err">{err}</div>}

      <div className="grid" data-tour="dash-stats">
        {items?.map(([k, v]) => (
          <Link key={k} to={STAT_LINKS[k] || '/'} className="stat-link">
            <div className="card stat">
              <b>{v}</b>
              <span>{k}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" data-tour="dash-flow">
        <h2>
          How to use <Tip id="dash.flow" />
        </h2>
        <blockquote className="why" style={{ marginBottom: 14 }}>
          “Create once. Lock identity. Reuse the same face, product, or room across every campaign.”
        </blockquote>
        <ol>
          <li>
            <Link className="flow-link" to="/identities">
              Identity Lock
            </Link>{' '}
            — reference upload, profile, Lock. Types: product, character, environment, brand.
          </li>
          <li>
            <Link className="flow-link" to="/prompts">
              Prompt OS
            </Link>{' '}
            — private templates with <code>{'{{identity}} {{scene}} {{style}}'}</code>.
          </li>
          <li>
            <Link className="flow-link" to="/studio">
              Studio
            </Link>{' '}
            — locked identities + brief → prompt or generate.
          </li>
          <li>
            <Link className="flow-link" to="/check">
              Check & Analysis
            </Link>{' '}
            — consistency score + image analysis.
          </li>
          <li>
            <Link className="flow-link" to="/assets">
              Asset Bank
            </Link>{' '}
            — private store, groups, categories.
          </li>
          <li>
            <Link className="flow-link" to="/open-shelf">
              Open Shelf
            </Link>{' '}
            — shared assets and templates.
          </li>
          <li>
            <Link className="flow-link" to="/recycle">
              Recycle Bin
            </Link>{' '}
            — 24-hour recovery after group delete.
          </li>
        </ol>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <TourProvider steps={TOUR_STEPS} autoStart>
      <DashboardInner />
    </TourProvider>
  );
}
