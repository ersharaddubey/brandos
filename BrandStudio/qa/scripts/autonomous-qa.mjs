import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

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
const uiBase = (env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const apiBase = (env.QA_API_URL || 'http://localhost:5003').replace(/\/$/, '');
const user = env.QA_USERNAME || env.ADMIN_USERNAME || '';
const pass = env.QA_PASSWORD || env.ADMIN_PASSWORD || '';
const timeoutMs = Math.max(1000, Number(env.QA_TIMEOUT_MS || 12000));
const results = [];
const started = new Date();
let token = '';
let createdPromptId = '';
let screenshotPath = '';
const runId = crypto.randomUUID().slice(0, 8);

function add(area, name, status, detail = '', fix = '') {
  results.push({ area, name, status, detail: String(detail).slice(0, 500), suggestedFix: String(fix).slice(0, 400) });
  const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '!';
  console.log(`${mark} [${status}] ${area}: ${name}${detail ? ` — ${String(detail).slice(0, 150)}` : ''}`);
}
async function req(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options, signal: controller.signal,
      headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
  } finally { clearTimeout(timer); }
}
async function check(area, name, url, accepted = [200], fix = 'Verify the service is running, the URL/port is correct, and inspect server logs.') {
  try {
    const t = Date.now();
    const res = await req(url);
    const body = await res.text();
    const ok = accepted.includes(res.status);
    add(area, name, ok ? 'PASS' : 'FAIL', `HTTP ${res.status}, ${Date.now() - t}ms${body ? `; ${body.slice(0, 100).replace(/\s+/g, ' ')}` : ''}`, ok ? '' : fix);
    return { res, body };
  } catch (e) {
    add(area, name, 'FAIL', e.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : e.message, fix);
    return null;
  }
}
const json = async (res) => res.json().catch(() => ({}));
console.log(`BrandStudio Autonomous QA ${started.toISOString()} | run=${runId}`);
console.log(`UI=${uiBase} API=${apiBase}`);

const ui = await check('Frontend', 'UI responds', uiBase, [200], 'Start Vite with npm run dev:client or set QA_BASE_URL.');
if (ui) add('Frontend', 'React root mount', ui.body.includes('id="root"') ? 'PASS' : 'FAIL', 'Expected root element in HTML', 'Check client/index.html and the Vite entry point.');
for (const route of ['/', '/identities', '/prompts', '/studio', '/check', '/assets', '/open-shelf', '/recycle', '/integrations', '/autonomy']) {
  try {
    const r = await req(`${uiBase}${route}`); const body = await r.text();
    add('Navigation', `SPA route ${route}`, r.status === 200 && body.includes('id="root"') ? 'PASS' : 'FAIL', `HTTP ${r.status}`, 'Check Vite SPA fallback and frontend router configuration.');
  } catch (e) { add('Navigation', `SPA route ${route}`, 'FAIL', e.message, 'Check frontend server availability.'); }
}
let health;
try {
  const r = await req(`${apiBase}/api/health`); health = await json(r);
  add('API', 'Health endpoint', r.ok && health.ok === true ? 'PASS' : 'FAIL', `HTTP ${r.status}; db=${health.db}; ollama=${health.ollama}; generator=${health.generator}`, 'Inspect server logs and /api/health implementation.');
  add('Database', 'Database connection', health.db === true ? 'PASS' : 'WARN', health.db === true ? 'Connected' : 'DB not connected', 'Check MongoDB availability and MONGO_URI.');
} catch (e) { add('API', 'Health endpoint', 'FAIL', e.message, 'Start API and MongoDB; verify QA_API_URL.'); }

if (user && pass) {
  try {
    const r = await req(`${apiBase}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
    const d = await json(r);
    if (r.ok && d.token) { token = d.token; add('Authentication', 'Admin login', 'PASS'); }
    else add('Authentication', 'Admin login', 'FAIL', `HTTP ${r.status}; credentials rejected`, 'Set QA_USERNAME/QA_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD in server/.env.');
  } catch (e) { add('Authentication', 'Admin login', 'FAIL', e.message, 'Verify API availability and QA credentials.'); }
} else add('Authentication', 'Admin login', 'WARN', 'Credentials not configured; protected endpoint checks skipped.', 'Set QA_USERNAME and QA_PASSWORD in environment or server/.env.');

const protectedRoutes = [
  ['/api/auth/me','Session identity'], ['/api/stats','Dashboard stats'], ['/api/autonomy','Autonomous OS'],
  ['/api/identities','Identity list'], ['/api/identities/meta/keys','Identity metadata'], ['/api/identities/meta/schema','Identity schema'],
  ['/api/prompts','Prompt list'], ['/api/assets','Asset list'], ['/api/assets/search','Asset search'],
  ['/api/assets/duplicates','Duplicate scan'], ['/api/generations','Generation history'], ['/api/groups','Asset groups'],
  ['/api/recycle','Recycle bin'], ['/api/providers/integrations/status','Integration status'],
  ['/api/providers/a1111/status','A1111 status'], ['/api/providers/comfyui/status','ComfyUI status'],
  ['/api/providers/comfyui/instantid/status','InstantID status'], ['/api/providers/grounded-sam-2/status','Grounded SAM 2 status']
];
if (token) {
  for (const [route, label] of protectedRoutes) {
    try {
      const r = await req(`${apiBase}${route}`); const body = await r.text();
      const optional = route.includes('/providers/');
      const status = r.status >= 200 && r.status < 300 ? 'PASS' : optional && [404, 503].includes(r.status) ? 'WARN' : 'FAIL';
      add('Module API', label, status, `HTTP ${r.status}; ${body.slice(0, 90).replace(/\s+/g, ' ')}`, status === 'FAIL' ? 'Check route registration, auth middleware, and server logs.' : '');
    } catch (e) { add('Module API', label, 'FAIL', e.message, 'Check API availability.'); }
  }
} else add('Module API', 'Protected endpoints', 'WARN', 'Skipped: no successful admin login.');

// Regression check for the reported E11000 autonomyagents key_1 / ceo collision.
if (token) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await req(`${apiBase}/api/autonomy`);
      const data = await json(r);
      const agents = Array.isArray(data.agents) ? data.agents : [];
      const keys = agents.map((agent) => agent.key);
      const ceoCount = keys.filter((key) => key === 'ceo').length;
      const uniqueKeys = new Set(keys).size === keys.length;
      const ok = r.ok && ceoCount === 1 && uniqueKeys;
      add('Autonomy regression', `Idempotent agent seed attempt ${attempt}`, ok ? 'PASS' : 'FAIL',
        `HTTP ${r.status}; agents=${agents.length}; ceo=${ceoCount}; uniqueKeys=${uniqueKeys}`,
        'Check the legacy autonomyagents key_1 index and tenant-scoped seedAgents() logic.');
    } catch (e) {
      add('Autonomy regression', `Idempotent agent seed attempt ${attempt}`, 'FAIL', e.message,
        'Inspect MongoDB indexes and the /api/autonomy route logs.');
    }
  }
} else add('Autonomy regression', 'Idempotent agent seed', 'WARN', 'Skipped: admin login unavailable.');

const destructiveRequested = env.QA_ALLOW_DESTRUCTIVE === 'true';
const uri = env.QA_MONGODB_URI || '';
let dbName = '';
try {
  const parsed = new URL(uri);
  dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '');
} catch {}

const apiIsLocalQa = (() => {
  try {
    const u = new URL(apiBase);
    return ['localhost', '127.0.0.1'].includes(u.hostname) && u.port === '5003';
  } catch { return false; }
})();

const isolated =
  Boolean(env.QA_MONGODB_URI) &&
  dbName === 'brandstudio_qa' &&
  apiIsLocalQa &&
  health?.db === true &&
  health?.dbName === 'brandstudio_qa';

if (destructiveRequested && token && isolated) {
  // Explicitly isolated prompt CRUD test. Uses only a unique synthetic record created by this run.
  const name = `__QA_AUTONOMOUS_${runId}`;
  try {
    const create = await req(`${apiBase}/api/prompts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, body: 'QA fixture prompt - safe to delete', tags: ['qa-agent', runId], visibility: 'private', note: 'Autonomous QA fixture' }) });
    const created = await json(create);
    createdPromptId = created._id || created.id || '';
    add('CRUD', 'Create synthetic prompt', create.status === 201 && createdPromptId ? 'PASS' : 'FAIL', `HTTP ${create.status}; fixture ID ${createdPromptId ? 'captured' : 'missing'}`, 'Verify POST /api/prompts schema and response.');
    if (createdPromptId) {
      const read = await req(`${apiBase}/api/prompts/${createdPromptId}`);
      const readData = await json(read);
      add('CRUD', 'Read synthetic prompt', read.ok && readData.name === name ? 'PASS' : 'FAIL', `HTTP ${read.status}`, 'Check GET /api/prompts/:id.');
      const version = await req(`${apiBase}/api/prompts/${createdPromptId}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'QA fixture prompt - updated version', note: 'Autonomous QA version test' }) });
      const versionData = await json(version);
      add('CRUD', 'Update via version history', version.ok && Number(versionData.currentVersion) >= 2 ? 'PASS' : 'FAIL', `HTTP ${version.status}; currentVersion=${versionData.currentVersion}`, 'Check POST /api/prompts/:id/versions and PromptTemplate model.');
      const del = await req(`${apiBase}/api/prompts/${createdPromptId}`, { method: 'DELETE' });
      add('CRUD', 'Delete synthetic prompt', del.ok ? 'PASS' : 'FAIL', `HTTP ${del.status}`, 'Check DELETE /api/prompts/:id.');
      const verify = await req(`${apiBase}/api/prompts/${createdPromptId}`);
      add('CRUD', 'Verify deleted prompt absent', verify.status === 404 ? 'PASS' : 'FAIL', `HTTP ${verify.status}`, 'Confirm delete operation and not-found response.');
      createdPromptId = '';
    }
  } catch (e) {
    add('CRUD', 'Synthetic prompt workflow', 'FAIL', e.message, 'Inspect prompt route/model; clean up any __QA_AUTONOMOUS_ fixture manually if needed.');
  } finally {
    if (createdPromptId) {
      try { await req(`${apiBase}/api/prompts/${createdPromptId}`, { method: 'DELETE' }); add('Cleanup', 'Remove leftover synthetic prompt', 'PASS', 'Cleanup request sent'); }
      catch (e) { add('Cleanup', 'Remove leftover synthetic prompt', 'FAIL', e.message, 'Delete the synthetic prompt from the isolated QA database.'); }
    }
  }
} else {
  add('CRUD', 'Synthetic CRUD workflow', 'WARN',
    !destructiveRequested ? 'Skipped: set QA_ALLOW_DESTRUCTIVE=true to opt in.' :
    !env.QA_MONGODB_URI ? 'Skipped: QA_MONGODB_URI must be explicitly set.' :
    dbName !== 'brandstudio_qa' ? 'Skipped: QA database must be exactly brandstudio_qa.' :
    !apiIsLocalQa ? 'Skipped: API must be localhost:5003.' :
    health?.db !== true || health?.dbName !== 'brandstudio_qa' ? 'Skipped: API health did not confirm connection to brandstudio_qa.' :
    !token ? 'Skipped: valid admin login required.' : 'Skipped: safety verification failed.',
    'Use a dedicated QA database, set QA_MONGODB_URI plus QA_ALLOW_DESTRUCTIVE=true, and never target production.');
}

const sourceFiles = [
 'client/src/pages/Dashboard.jsx','client/src/pages/Identities.jsx','client/src/pages/IdentityDetail.jsx',
 'client/src/pages/PromptOS.jsx','client/src/pages/Studio.jsx','client/src/pages/Check.jsx',
 'client/src/pages/AssetBank.jsx','client/src/pages/OpenShelf.jsx','client/src/pages/RecycleBin.jsx',
 'client/src/pages/Integrations.jsx','client/src/pages/Autonomy.jsx'
];
const present = sourceFiles.filter(f => fs.existsSync(path.join(root, f))).length;
add('Static audit', 'Feature page source files', present === sourceFiles.length ? 'PASS' : 'FAIL', `${present}/${sourceFiles.length} expected files present`, 'Review client/src/pages and update route/page imports.');
for (const [file, label] of [['server/src/routes/prompts.js','Prompt CRUD route'],['server/src/routes/assets.js','Asset/upload route'],['server/src/routes/recycle.js','Recycle/restore route'],['server/src/services/generationRunner.js','Generation workflow'],['server/src/services/ollama.js','Ollama adapter']]) {
  add('Static audit', label, fs.existsSync(path.join(root, file)) ? 'PASS' : 'FAIL', file, 'Restore or update the expected module and app route registration.');
}

// Optional browser screenshot. This remains optional so QA works without Playwright installed.
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const response = await page.goto(uiBase, { waitUntil: 'networkidle', timeout: timeoutMs });
  await page.screenshot({ path: path.join(reportDir, `qa-screenshot-${runId}.png`), fullPage: true });
  screenshotPath = `qa/reports/qa-screenshot-${runId}.png`;
  add('Browser', 'Playwright page load', response?.ok() ? 'PASS' : 'FAIL', `HTTP ${response?.status()}; screenshot=${screenshotPath}`, 'Check browser console and frontend runtime.');
  add('Browser', 'Uncaught page errors', pageErrors.length ? 'FAIL' : 'PASS', pageErrors.slice(0, 5).join(' | ') || 'No uncaught page errors', 'Inspect browser stack traces and fix the first runtime exception.');
  await browser.close();
} catch {
  add('Browser', 'Screenshot and runtime check', 'WARN', 'Playwright not installed or browser unavailable; API/static checks still ran.', 'Optional: npm install --save-dev playwright && npx playwright install chromium.');
}

add('Safety', 'Production mutation guard', 'PASS', 'CRUD tests require explicit opt-in, QA_MONGODB_URI for brandstudio_qa, and verified localhost:5003 health dbName.');
add('Coverage', 'Image upload + preview/storage', 'WARN', 'Not exercised automatically in this runner; avoid uploading fixtures until a QA-only storage prefix is configured.', 'Add a dedicated QA Cloudinary folder/local uploads directory and validate image metadata and preview with a known fixture.');
add('Coverage', 'AI generation providers', 'WARN', `Configured generator=${health?.generator || 'unknown'}; provider status endpoints checked, but generation jobs are not launched to avoid external costs.`, 'Run provider-specific generation tests only with QA test credentials, explicit budget limits, and cleanup.');
add('Coverage', 'Recycle/restore round-trip', 'WARN', 'Recycle endpoint is read-only in this run; restore is not invoked automatically.', 'Enable only after a dedicated QA database and QA-only fixtures are verified.');
add('Repair', 'Automatic source modification', 'WARN', 'Agent proposes likely fixes in the report; it never rewrites application source automatically.', 'Review suggested fixes, patch code in version control, then rerun QA.');

const counts = Object.fromEntries(['PASS','FAIL','WARN'].map(s => [s, results.filter(r => r.status === s).length]));
const report = {
  project: 'BrandStudio', agent: 'Autonomous QA Agent', version: '1.0.0',
  mode: destructiveRequested && isolated ? 'isolated-qa-opt-in' : 'safe-smoke',
  runId, startedAt: started.toISOString(), finishedAt: new Date().toISOString(),
  targets: { ui: uiBase, api: apiBase },
  environment: { databaseConnected: health?.db === true, generator: health?.generator || 'unknown', credentialsConfigured: Boolean(user && pass), isolatedQaDatabaseDetected: isolated, screenshot: screenshotPath || null },
  counts, overall: counts.FAIL ? 'NEEDS_ATTENTION' : counts.WARN ? 'PARTIAL' : 'PASS',
  results,
  recommendations: [
    'Use a dedicated QA MongoDB database and a QA-only storage prefix before mutation tests.',
    'Configure Playwright for browser screenshots and client-side runtime errors.',
    'Configure test-only image fixtures and provider budgets before upload or AI generation tests.',
    'Keep suggested repairs human-reviewed; rerun the agent after each fix.',
    'Never run destructive tests against production data.'
  ]
};
const stamp = started.toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `autonomous-qa-${stamp}.json`);
const mdPath = path.join(reportDir, `autonomous-qa-${stamp}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
const md = [
 '# BrandStudio — Autonomous QA Report', '',
 `- Overall: **${report.overall}**`,
 `- Mode: \`${report.mode}\``,
 `- Started: ${report.startedAt}`, `- Finished: ${report.finishedAt}`,
 `- UI: ${uiBase}`, `- API: ${apiBase}`,
 `- Results: ${counts.PASS} passed / ${counts.FAIL} failed / ${counts.WARN} warnings`,
 `- Screenshot: ${screenshotPath || 'not captured'}`, '',
 '## Checks', '', '| Area | Check | Status | Detail | Suggested fix |', '|---|---|---|---|---|',
 ...results.map(r => `| ${r.area} | ${r.name.replaceAll('|','/')} | ${r.status} | ${r.detail.replaceAll('|','/')} | ${r.suggestedFix.replaceAll('|','/')} |`),
 '', '## Recommendations', ...report.recommendations.map(x => `- ${x}`),
 '', '> Safe by default. Mutating prompt CRUD runs only with explicit opt-in and a separately configured QA database. This agent does not auto-edit source files or launch potentially billable image generation.'
].join('\n');
fs.writeFileSync(mdPath, md);
console.log(`\nOverall: ${report.overall} (${counts.PASS} pass, ${counts.FAIL} fail, ${counts.WARN} warnings)`);
console.log(`JSON report: ${path.relative(root, jsonPath)}`);
console.log(`Markdown report: ${path.relative(root, mdPath)}`);
if (counts.FAIL) process.exitCode = 1;
