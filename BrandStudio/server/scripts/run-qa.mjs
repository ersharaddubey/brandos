import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const reportDir = path.join(root, 'qa', 'reports');
fs.mkdirSync(reportDir, { recursive: true });

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
const env = { ...readEnv(path.join(root, 'server', '.env')), ...process.env };
const base = (env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const apiBase = (env.QA_API_URL || 'http://localhost:5002').replace(/\/$/, '');
const username = env.QA_USERNAME || env.ADMIN_USERNAME || '';
const password = env.QA_PASSWORD || env.ADMIN_PASSWORD || '';
const results = [];
const started = new Date();
let token = '';

function add(area, name, status, detail = '') {
  results.push({ area, name, status, detail: String(detail).slice(0, 500) });
  const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '!';
  console.log(`${mark} [${status}] ${area}: ${name}${detail ? ` — ${String(detail).slice(0, 160)}` : ''}`);
}
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(env.QA_TIMEOUT_MS || 12000));
  try { return await fetch(url, { ...options, signal: controller.signal, headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); }
  finally { clearTimeout(timer); }
}
async function checkHttp(area, name, url, accepted = [200]) {
  const t = Date.now();
  try {
    const res = await request(url);
    const ms = Date.now() - t;
    const body = await res.text();
    const ok = accepted.includes(res.status);
    add(area, name, ok ? 'PASS' : 'FAIL', `HTTP ${res.status}, ${ms}ms${body ? `; ${body.slice(0, 110).replace(/\s+/g, ' ')}` : ''}`);
    return { res, body, ms };
  } catch (e) { add(area, name, 'FAIL', e.message); return null; }
}

console.log(`BrandStudio QA started: ${started.toISOString()}`);
console.log(`UI: ${base} | API: ${apiBase}`);

// Frontend and SPA route smoke checks (read-only).
const ui = await checkHttp('Frontend', 'Vite app responds', base, [200]);
if (ui && !ui.body.toLowerCase().includes('<div id="root"')) add('Frontend', 'React root mount exists', 'FAIL', 'index.html did not contain #root');
else if (ui) add('Frontend', 'React root mount exists', 'PASS');
const pages = ['/', '/identities', '/prompts', '/studio', '/check', '/assets', '/open-shelf', '/recycle', '/integrations', '/autonomy'];
for (const page of pages) {
  try {
    const res = await request(`${base}${page}`);
    const html = await res.text();
    add('Navigation', `SPA route ${page}`, res.status === 200 && html.includes('id="root"') ? 'PASS' : 'FAIL', `HTTP ${res.status}`);
  } catch (e) { add('Navigation', `SPA route ${page}`, 'FAIL', e.message); }
}

// Public API health.
let health = null;
try {
  const res = await request(`${apiBase}/api/health`);
  const data = await res.json().catch(() => ({}));
  health = data;
  add('API', 'Health endpoint', res.ok && data.ok === true ? 'PASS' : 'FAIL', `HTTP ${res.status}; DB=${data.db}; Ollama=${data.ollama}; generator=${data.generator}`);
  add('Database', 'MongoDB connection', data.db === true ? 'PASS' : 'WARN', data.db === true ? 'Connected' : 'Not connected; DB-backed checks may be blocked');
} catch (e) { add('API', 'Health endpoint', 'FAIL', e.message); }

// Auth verification: no credentials are printed or included in reports.
if (username && password) {
  try {
    const res = await request(`${apiBase}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) { token = data.token; add('Authentication', 'Configured admin login', 'PASS'); }
    else add('Authentication', 'Configured admin login', 'FAIL', `HTTP ${res.status}; credentials rejected`);
  } catch (e) { add('Authentication', 'Configured admin login', 'FAIL', e.message); }
} else add('Authentication', 'Admin login', 'WARN', 'Set QA_USERNAME and QA_PASSWORD (or ADMIN_USERNAME and ADMIN_PASSWORD in server/.env) to test protected APIs.');

if (token) {
  const endpoints = [
    ['/api/auth/me', 'Session identity'], ['/api/stats', 'Dashboard statistics'], ['/api/autonomy', 'Autonomous OS'],
    ['/api/identities', 'Identity Lock list'], ['/api/identities/meta/keys', 'Identity key metadata'], ['/api/identities/meta/schema', 'Identity schema'],
    ['/api/prompts', 'Prompt OS list'], ['/api/assets', 'Asset Bank list'], ['/api/assets/search', 'Asset search'], ['/api/assets/duplicates', 'Duplicate asset scan'],
    ['/api/generations', 'Generation history'], ['/api/groups', 'Asset groups'], ['/api/recycle', 'Recycle Bin'],
    ['/api/providers/integrations/status', 'Integration status'], ['/api/providers/a1111/status', 'A1111 provider status'],
    ['/api/providers/comfyui/status', 'ComfyUI provider status'], ['/api/providers/comfyui/instantid/status', 'InstantID provider status'],
    ['/api/providers/grounded-sam-2/status', 'Grounded SAM 2 status'],
  ];
  for (const [route, label] of endpoints) {
    const t = Date.now();
    try {
      const res = await request(`${apiBase}${route}`);
      const ms = Date.now() - t;
      const body = await res.text();
      // Optional integrations may legitimately be unavailable; record as WARN, not app failure.
      const optional = route.includes('/providers/');
      const status = res.status >= 200 && res.status < 300 ? 'PASS' : optional && res.status === 503 ? 'WARN' : 'FAIL';
      add('Module API', label, status, `HTTP ${res.status}, ${ms}ms${body ? `; ${body.slice(0, 100).replace(/\s+/g, ' ')}` : ''}`);
    } catch (e) { add('Module API', label, 'FAIL', e.message); }
  }
} else {
  add('Module API', 'Protected feature endpoints', 'WARN', 'Skipped because a valid QA login was not available.');
}

// Unsplash is tested only when the owner supplies a private Access Key.
if (env.UNSPLASH_ACCESS_KEY) {
  try {
    const u = new URL('https://api.unsplash.com/search/photos');
    u.searchParams.set('query', 'interior design'); u.searchParams.set('per_page', '3');
    const res = await fetch(u, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' } });
    const data = await res.json().catch(() => ({}));
    const photos = data.results || [];
    const valid = res.ok && photos.length > 0 && photos.every(p => p.urls?.regular?.startsWith('https://images.unsplash.com/') && p.user?.links?.html && p.links?.html);
    add('Unsplash', 'Search API + photo metadata', valid ? 'PASS' : 'FAIL', `HTTP ${res.status}; ${photos.length} results; image URLs and photographer links ${valid ? 'present' : 'missing/invalid'}`);
    if (valid) {
      const photo = photos[0];
      add('Unsplash', 'Attribution metadata', photo.user?.name && photo.user?.links?.html ? 'PASS' : 'FAIL', 'Photographer name/profile and photo page must be shown with the image.');
      const img = await fetch(photo.urls.small, { method: 'HEAD' });
      add('Unsplash', 'Hotlinked image URL', img.ok ? 'PASS' : 'FAIL', `HTTP ${img.status}; URL returned by Unsplash API is used unchanged`);
    }
  } catch (e) { add('Unsplash', 'Search API', 'FAIL', e.message); }
} else add('Unsplash', 'API integration', 'WARN', 'UNSPLASH_ACCESS_KEY not configured; add it to server/.env. No scraping or guessed image URLs are used.');

// Static source audit: discover pages and API client methods without modifying code/data.
const sourceFiles = [
  'client/src/pages/Dashboard.jsx','client/src/pages/Identities.jsx','client/src/pages/IdentityDetail.jsx','client/src/pages/PromptOS.jsx',
  'client/src/pages/Studio.jsx','client/src/pages/Check.jsx','client/src/pages/AssetBank.jsx','client/src/pages/OpenShelf.jsx',
  'client/src/pages/RecycleBin.jsx','client/src/pages/Integrations.jsx','client/src/pages/Autonomy.jsx'
];
let present = 0;
for (const file of sourceFiles) if (fs.existsSync(path.join(root, file))) present++;
add('Static audit', 'Feature page source files', present === sourceFiles.length ? 'PASS' : 'FAIL', `${present}/${sourceFiles.length} expected page files found`);
add('Data safety', 'Non-destructive test mode', 'PASS', 'This runner performs GET checks and one authentication request only. It does not create, update, delete, upload or generate app records.');
add('Coverage limitation', 'Write workflows / uploads / generation / delete-restore', 'WARN', 'Not executed by this safe smoke run. These require a dedicated QA database and explicit opt-in fixture setup.');

const counts = Object.fromEntries(['PASS','FAIL','WARN'].map(s => [s, results.filter(x => x.status === s).length]));
const report = {
  project: 'BrandStudio', mode: 'read-only-local-smoke-test', startedAt: started.toISOString(), finishedAt: new Date().toISOString(),
  targets: { ui: base, api: apiBase }, environment: { databaseConnected: health?.db === true, generator: health?.generator || 'unknown', unsplashConfigured: Boolean(env.UNSPLASH_ACCESS_KEY) },
  counts, overall: counts.FAIL ? 'NEEDS_ATTENTION' : counts.WARN ? 'PARTIAL' : 'PASS', results,
  recommendations: [
    'Configure Unsplash Access Key in server/.env; keep it server-side and never expose it in Vite client variables.',
    'Use a separate QA MongoDB database before enabling synthetic create/update/delete tests.',
    'Add browser-level Playwright tests and upload/generation fixtures after QA database isolation is verified.',
    'Do not remove a feature solely because it appears unused; require usage evidence and owner approval.'
  ]
};
const stamp = started.toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `qa-report-${stamp}.json`);
const mdPath = path.join(reportDir, `qa-report-${stamp}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
const md = [`# BrandStudio QA Report`, ``, `- Overall: **${report.overall}**`, `- Started: ${report.startedAt}`, `- Finished: ${report.finishedAt}`, `- UI: ${base}`, `- API: ${apiBase}`, `- Counts: ${counts.PASS} passed / ${counts.FAIL} failed / ${counts.WARN} warnings`, ``, `## Results`, ``, `| Area | Check | Status | Detail |`, `|---|---|---|---|`, ...results.map(x => `| ${x.area} | ${x.name.replaceAll('|','/')} | ${x.status} | ${x.detail.replaceAll('|','/')} |`), ``, `## Recommendations`, ...report.recommendations.map(x => `- ${x}`), ``, `> This run is read-only. It does not prove correctness of workflows that require uploads, writes, external generation or destructive operations.`].join('\n');
fs.writeFileSync(mdPath, md);
console.log(`\nOverall: ${report.overall} (${counts.PASS} pass, ${counts.FAIL} fail, ${counts.WARN} warnings)`);
console.log(`JSON report: ${path.relative(root, jsonPath)}`);
console.log(`Markdown report: ${path.relative(root, mdPath)}`);
if (counts.FAIL) process.exitCode = 1;
