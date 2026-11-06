# BrandStudio — Autonomous QA Agent

The QA agent adds automated application inspection and repeatable reports to BrandStudio. It is **safe by default** and does not automatically edit application source.

## What it checks

- Frontend availability and SPA routes.
- API health, MongoDB connectivity and configured admin login.
- Dashboard, identity, prompt, asset, generation, group, recycle and integration APIs.
- Static presence of core application modules.
- Optional Playwright browser load, JavaScript runtime errors and a full-page screenshot.
- Optional synthetic Prompt OS CRUD + version-history test in a separate QA database.
- JSON and Markdown reports with PASS / FAIL / WARN and suggested repairs.

## Quick start

1. Copy `server/.env.example` to `server/.env` and fill in your own settings. Never commit or share `.env`.
2. Install dependencies: `npm run install:all`.
3. Start MongoDB and the API: `npm run dev:server`.
4. Start the UI in a second terminal: `npm run dev:client`.
5. Start the frontend and backend in separate terminals.
6. Run **everything in one command**: `npm run test:all`. It runs Node syntax checks, backend unit tests, frontend production build, then live API/browser/module QA and writes a combined report.

Default targets are `http://localhost:5173` and `http://localhost:5002`. Override them with `QA_BASE_URL` and `QA_API_URL`.

## Optional browser screenshot

Playwright is optional. If you want browser runtime checks and screenshots:

```bash
npm install --save-dev playwright
npx playwright install chromium
npm run qa:agent
```

Screenshots and timestamped reports are written to `qa/reports/`.

## Opt-in synthetic CRUD test (isolated QA database only)

**Do not enable this against production.** The CRUD workflow creates a uniquely named synthetic Prompt OS record, reads it, adds a version, deletes it, verifies deletion, and attempts cleanup if the run fails.

1. Create a dedicated MongoDB database whose name clearly includes `qa` or `test`, e.g. `brandstudio_qa`. Use a dedicated user with limited permissions.
2. Set `QA_MONGODB_URI` to that isolated database URI. It must be explicitly set; the agent will not opt in based only on `MONGO_URI`. When `QA_ALLOW_DESTRUCTIVE=true`, server config intentionally prioritizes `QA_MONGODB_URI` so the API uses the isolated database.
3. Set `QA_ALLOW_DESTRUCTIVE=true`.
4. Set `QA_USERNAME` and `QA_PASSWORD` for a QA admin account that authenticates to the API.
5. Start the API using that same QA database configuration, then run `npm run qa:agent`.

The agent additionally checks that the API health endpoint reports `db: true`. If any guard is missing, CRUD is skipped and reported as WARN. Keep a backup and never point these variables at production.

## Environment variables

- `QA_BASE_URL` — frontend base URL.
- `QA_API_URL` — API base URL.
- `QA_USERNAME`, `QA_PASSWORD` — QA login (otherwise `ADMIN_USERNAME` / `ADMIN_PASSWORD` are read).
- `QA_TIMEOUT_MS` — per-request timeout, default 12000.
- `QA_MONGODB_URI` — explicit isolated QA database URI required for mutation tests.
- `QA_ALLOW_DESTRUCTIVE=true` — explicit opt-in to synthetic CRUD.

Credentials and auth tokens are not written into reports. Do not use real customer data as fixtures.

## One-command full test

Run from the project root after both local servers are running:

```bash
npm run test:all
```

The command performs source syntax validation, backend unit tests, frontend production build, and the live QA suites. It creates `qa/reports/test-all-<timestamp>.md` and `.json`. Live browser checks need Playwright Chromium installed. The command reports any unavailable optional check as a warning rather than claiming it passed.

## Scope and limitations

- Upload testing and image preview/storage verification are **not** automatically performed yet. Configure a QA-only upload directory or Cloudinary folder before adding those tests.
- AI generation providers are status-checked, not invoked; real generation may cost money or consume provider quotas.
- Recycle/restore endpoints are inspected but not mutated automatically.
- Suggested repairs are reported for human review. The agent intentionally does not patch source files or deploy code autonomously.
- Reports describe the environment at the time of the run. A WARN can mean an optional provider is not running, not necessarily that core BrandStudio is broken.

## Output

- `qa/reports/autonomous-qa-<timestamp>.md`
- `qa/reports/autonomous-qa-<timestamp>.json`
- Optional `qa/reports/qa-screenshot-<run-id>.png`

Use `npm run test:all` for the complete suite. For individual runs, use `npm run qa:smoke`, `npm run qa:agent`, or `npm run qa:phase2`.
