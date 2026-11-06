import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const base = (process.env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const api = (process.env.QA_API_URL || 'http://localhost:5003').replace(/\/$/, '');
const timeout = Number(process.env.QA_TIMEOUT_MS || 12000);
const results = [];
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const reports = path.join(root, 'qa', 'reports');
fs.mkdirSync(reports, { recursive: true });
const add = (name, status, detail) => results.push({ name, status, detail });
async function request(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...opts, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function jsonResponse(res) { try { return await res.json(); } catch { return {}; } }

console.log(`BrandStudio Phase 2 QA | run ${runId}`);
// UI reachability and routes
for (const route of ['/', '/identities', '/prompts', '/studio', '/check', '/assets', '/open-shelf', '/recycle', '/integrations', '/autonomy']) {
  try {
    const r = await request(`${base}${route}`);
    add(`UI ${route}`, r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
  } catch (e) { add(`UI ${route}`, 'FAIL', e.message); }
}
// Health and API read endpoints
let health = {};
try {
  const r = await request(`${api}/api/health`); health = await jsonResponse(r);
  add('API health', r.ok && health.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}; db=${health.db}; generator=${health.generator}`);
} catch (e) { add('API health', 'FAIL', e.message); }
let token = '';
const username = process.env.QA_USERNAME || process.env.ADMIN_USERNAME;
const password = process.env.QA_PASSWORD || process.env.ADMIN_PASSWORD;
if (username && password) {
  try {
    const r = await request(`${api}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await jsonResponse(r);
    token = data.token || data.accessToken || data.access_token || '';
    if (token) add('QA authentication', 'PASS', 'Login token received; token is not recorded');
    else add('QA authentication', 'WARN', `Login returned HTTP ${r.status}; response did not contain a recognized token field`);
  } catch (e) { add('QA authentication', 'WARN', e.message); }
} else add('QA authentication', 'WARN', 'Skipped: set QA_USERNAME and QA_PASSWORD');
const headers = token ? { authorization: `Bearer ${token}` } : {};
if (token) {
  for (const endpoint of ['/api/auth/me','/api/stats','/api/groups','/api/recycle','/api/identities','/api/prompts','/api/assets','/api/generations','/api/providers','/api/autonomy']) {
    try {
      const r = await request(`${api}${endpoint}`, { headers });
      const expected = r.status >= 200 && r.status < 300;
      add(`Authenticated GET ${endpoint}`, expected ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
    } catch (e) { add(`Authenticated GET ${endpoint}`, 'FAIL', e.message); }
  }
} else add('Authenticated API suite', 'WARN', 'Skipped because login credentials/token are unavailable');

// Safe CRUD is strictly opt-in and requires an explicitly isolated QA/test DB URI.
const mongoUri = process.env.QA_MONGODB_URI || '';
const dbName = (() => { try { return new URL(mongoUri).pathname.replace(/^\//, '').split('?')[0]; } catch { return ''; } })();
const apiIsLocalQa = (() => {
  try {
    const u = new URL(api);
    return ['localhost', '127.0.0.1'].includes(u.hostname) && u.port === '5003';
  } catch { return false; }
})();
const destructiveAllowed =
  process.env.QA_ALLOW_DESTRUCTIVE === 'true' &&
  dbName === 'brandstudio_qa' &&
  health.db === true &&
  health.dbName === 'brandstudio_qa' &&
  apiIsLocalQa &&
  !!mongoUri &&
  !!token;
if (destructiveAllowed) {
  let createdId = '';
  try {
    const name = `QA Phase2 ${runId}`;
    const create = await request(`${api}/api/prompts`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ name, body: 'Synthetic QA fixture; safe to delete.', tags: ['qa-only'], visibility: 'private', note: 'Phase 2 automated QA' }) });
    const doc = await jsonResponse(create); createdId = String(doc._id || doc.id || '');
    add('Prompt CRUD create', create.status === 201 && createdId ? 'PASS' : 'FAIL', `HTTP ${create.status}; synthetic record only`);
    if (createdId) {
      const read = await request(`${api}/api/prompts/${createdId}`, { headers });
      add('Prompt CRUD read', read.ok ? 'PASS' : 'FAIL', `HTTP ${read.status}`);
      const version = await request(`${api}/api/prompts/${createdId}/versions`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ body: 'Synthetic QA fixture version 2.', note: 'Phase 2 version check' }) });
      add('Prompt version history', version.ok ? 'PASS' : 'FAIL', `HTTP ${version.status}`);
      const del = await request(`${api}/api/prompts/${createdId}`, { method: 'DELETE', headers });
      add('Prompt CRUD delete', del.ok ? 'PASS' : 'FAIL', `HTTP ${del.status}`);
      const verify = await request(`${api}/api/prompts/${createdId}`, { headers });
      add('Prompt deletion verification', verify.status === 404 ? 'PASS' : 'FAIL', `Expected 404; got HTTP ${verify.status}`);
      createdId = '';
    }
  } catch (e) { add('Prompt CRUD lifecycle', 'FAIL', e.message); }
  finally { if (createdId) { try { await request(`${api}/api/prompts/${createdId}`, { method: 'DELETE', headers }); } catch {} } }
} else add('Synthetic CRUD lifecycle', 'WARN', 'Skipped. Requires explicit opt-in, QA_MONGODB_URI for brandstudio_qa, verified API health dbName=brandstudio_qa on localhost:5003, and QA credentials.');

// Optional upload contract: run only when the operator explicitly supplies a QA upload endpoint.
if (process.env.QA_UPLOAD_URL && token) {
  try {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
    const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'qa-fixture.png');
    const r = await request(process.env.QA_UPLOAD_URL, { method: 'POST', headers, body: form });
    add('Configured QA image upload', r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}; endpoint supplied explicitly`);
  } catch (e) { add('Configured QA image upload', 'FAIL', e.message); }
} else add('Image upload/preview/storage', 'WARN', 'Not executed: set QA_UPLOAD_URL to a QA-only upload endpoint; upload field name defaults to file.');

// Browser runtime check: Playwright is optional and never auto-installs browsers.
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  try {
    const r = await page.goto(base, { waitUntil: 'networkidle', timeout });
    add('Browser initial render', r?.ok() ? 'PASS' : 'FAIL', `HTTP ${r?.status()}; title=${await page.title()}`);
    const rootEl = await page.locator('#root').count();
    add('React root mounted', rootEl > 0 ? 'PASS' : 'FAIL', `#root count=${rootEl}`);
    for (const route of ['/', '/identities', '/prompts', '/studio', '/check', '/assets', '/open-shelf', '/recycle', '/integrations', '/autonomy']) {
      try { await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout }); const visible = await page.locator('body').innerText({ timeout: 3000 }); add(`Browser route ${route}`, visible.trim().length ? 'PASS' : 'FAIL', `body text chars=${visible.trim().length}`); }
      catch (e) { add(`Browser route ${route}`, 'FAIL', e.message); }
    }
    const shot = path.join(reports, `phase2-screenshot-${runId}.png`);
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout }).catch(() => {});
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    add('Browser JavaScript errors', errors.length ? 'FAIL' : 'PASS', errors.length ? errors.slice(0, 8).join(' | ') : 'No console/page errors observed');
    if (fs.existsSync(shot)) add('UI screenshot', 'PASS', path.relative(root, shot));
  } finally { await browser.close(); }
} catch (e) {
  add('Playwright browser suite', 'WARN', `Skipped/unavailable: ${e.message}. Install with npm install --save-dev playwright && npx playwright install chromium`);
}

const counts = Object.fromEntries(['PASS','FAIL','WARN'].map(s => [s, results.filter(x => x.status === s).length]));
const report = { project: 'BrandStudio', suite: 'Phase 2 Autonomous QA', runId, startedAt: new Date(Number(runId.split('-')[0])).toISOString(), finishedAt: new Date().toISOString(), targets: { ui: base, api }, environment: { databaseConnected: Boolean(health.db), generator: health.generator || 'unknown', isolatedQaDatabaseDetected: /(^|[-_])(qa|test)([-_]|$)/i.test(dbName), credentialsConfigured: Boolean(username && password), destructiveTestsEnabled: destructiveAllowed }, counts, overall: counts.FAIL ? 'FAIL' : counts.WARN ? 'PARTIAL' : 'PASS', results, safety: ['No source code is modified automatically','Synthetic mutations run only with explicit isolated QA DB opt-in','No real AI generation is launched automatically','Never run destructive tests against production'] };
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reports, `phase2-qa-${stamp}.json`);
const mdPath = path.join(reports, `phase2-qa-${stamp}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, `# BrandStudio Phase 2 QA Report\n\n- Run: ${runId}\n- Overall: **${report.overall}**\n- UI: ${base}\n- API: ${api}\n- Database connected: ${Boolean(health.db)}\n- Generator: ${health.generator || 'unknown'}\n\n## Counts\n\n| Status | Count |\n|---|---:|\n| PASS | ${counts.PASS} |\n| FAIL | ${counts.FAIL} |\n| WARN | ${counts.WARN} |\n\n## Results\n\n| Status | Check | Detail |\n|---|---|---|\n${results.map(x => `| ${x.status} | ${x.name.replace(/\|/g,'\\|')} | ${String(x.detail).replace(/\|/g,'\\|').replace(/\n/g,' ')} |`).join('\n')}\n\n## Safety\n\n- No source code is modified automatically.\n- Synthetic mutations require explicit opt-in and a database name containing qa/test.\n- Image upload tests require an explicitly configured QA-only endpoint.\n- Real AI generation is not launched automatically.\n- Do not run destructive tests against production.\n`);
console.log(`\nOverall: ${report.overall} | PASS ${counts.PASS} | FAIL ${counts.FAIL} | WARN ${counts.WARN}`);
console.log(`Reports: ${path.relative(root,jsonPath)} and ${path.relative(root,mdPath)}`);
if (counts.FAIL) process.exitCode = 1;
