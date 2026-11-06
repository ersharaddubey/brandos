import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportDir = path.join(root, 'qa', 'reports');
fs.mkdirSync(reportDir, { recursive: true });
const startedAt = new Date();
const steps = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, args, options = {}) {
  console.log(`\n========== ${name} ==========`);
  const result = spawnSync(args[0], args.slice(1), {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
    ...options,
  });
  const status = result.error ? 'FAIL' : result.status === 0 ? 'PASS' : 'FAIL';
  steps.push({ name, status, exitCode: result.status, error: result.error?.message || '' });
  return status === 'PASS';
}

// Source syntax validation (ES modules and CommonJS-style JS are both parsed by Node).
const sourceRoots = ['server/src', 'server/scripts', 'server/tests', 'qa/scripts'];
const files = [];
for (const dir of sourceRoots) {
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|cjs|js)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, dir));
}
let syntaxOk = true;
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (check.status !== 0) {
    syntaxOk = false;
    console.error(`Syntax error: ${path.relative(root, file)}\n${check.stderr}`);
  }
}
steps.push({ name: `Node syntax check (${files.length} files)`, status: syntaxOk ? 'PASS' : 'FAIL' });
console.log(`${syntaxOk ? '✓' : '✗'} Node syntax check: ${files.length} files`);

const serverTestsOk = run('Backend unit tests', [npm, '--prefix', 'server', 'test']);
const frontendBuildOk = run('Frontend production build', [npm, '--prefix', 'client', 'run', 'build']);

// These suites check live local API/UI. Start the API and Vite in separate terminals first.
const liveQaOk = run('Live API + browser + module QA', [npm, 'run', 'qa:all']);

const counts = Object.fromEntries(['PASS', 'FAIL'].map((status) => [status, steps.filter((s) => s.status === status).length]));
const report = {
  project: 'BrandStudio', suite: 'One-command full QA',
  startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(),
  counts, overall: counts.FAIL ? 'FAIL' : 'PASS', steps,
  notes: [
    'Live QA requires the backend on localhost:5002 and frontend on localhost:5173 (or QA_BASE_URL/QA_API_URL).',
    'Synthetic write tests run only with QA_ALLOW_DESTRUCTIVE=true and an explicitly isolated QA_MONGODB_URI.',
    'Real image/video provider calls are not triggered automatically because they may cost money or consume quotas.',
    'A PASS means the executed checks passed; WARN/SKIP items inside component reports remain limitations, not verified features.'
  ]
};
const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `test-all-${stamp}.json`);
const mdPath = path.join(reportDir, `test-all-${stamp}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, `# BrandStudio Full QA\n\n- Overall: **${report.overall}**\n- Started: ${report.startedAt}\n- Finished: ${report.finishedAt}\n\n## Summary\n\n| Result | Count |\n|---|---:|\n| PASS | ${counts.PASS} |\n| FAIL | ${counts.FAIL} |\n\n## Steps\n\n| Status | Step | Detail |\n|---|---|---|\n${steps.map((s) => `| ${s.status} | ${s.name} | ${s.error || `exit ${s.exitCode ?? 0}`} |`).join('\n')}\n\n## Notes\n\n${report.notes.map((n) => `- ${n}`).join('\n')}\n`);
console.log(`\nFull QA result: ${report.overall} — PASS ${counts.PASS}, FAIL ${counts.FAIL}`);
console.log(`Reports: ${path.relative(root, mdPath)} and ${path.relative(root, jsonPath)}`);
if (counts.FAIL) process.exitCode = 1;
