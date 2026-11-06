# Phase 2 QA — Browser, API lifecycle, upload contract, reports

Phase 2 extends the existing safe-smoke agent with a separate `qa:phase2` runner. It is an opt-in test harness, not a promise that every integration has been exercised in every environment.

## Run

```bash
npm run install:all
# Terminal 1
npm run dev:server
# Terminal 2
npm run dev:client
# Terminal 3
npm run qa:phase2
```

Defaults: UI `http://localhost:5173`, API `http://localhost:5002`. Override with `QA_BASE_URL` and `QA_API_URL`.

## Browser runtime and screenshots

```bash
npm install --save-dev playwright
npx playwright install chromium
npm run qa:phase2
```

The suite checks route rendering, the React root, browser console/page errors, and saves a full-page screenshot under `qa/reports/`. It does not automatically click destructive UI controls or submit real generation jobs.

## Authenticated API checks

Set `QA_USERNAME` and `QA_PASSWORD` (or the app's `ADMIN_USERNAME` / `ADMIN_PASSWORD`) in the environment used to run QA. Credentials and tokens are never written to reports. The runner performs read-only authenticated GET checks on core endpoints.

## Synthetic prompt CRUD and version history (opt-in only)

Use only a dedicated QA database and a limited-permission QA account:

```bash
export QA_MONGODB_URI='mongodb://.../brandstudio_qa'
export QA_ALLOW_DESTRUCTIVE=true
export QA_USERNAME='your-qa-user'
export QA_PASSWORD='your-qa-password'
npm run qa:phase2
```

The database name must contain `qa` or `test`, and the explicit `QA_MONGODB_URI`, `QA_ALLOW_DESTRUCTIVE=true`, and working QA login are all required. The app server itself must also be running against that same isolated QA database. Never use production or customer data. The runner creates a unique private Prompt OS test record, reads it, adds a version, deletes it, verifies the 404, and attempts cleanup after failures.

## Image upload test (explicit endpoint only)

Set `QA_UPLOAD_URL` to an upload endpoint in a QA environment. The runner sends a tiny 1×1 PNG as multipart field `file`. Configure a QA-only storage prefix/folder before enabling this. This checks the upload HTTP contract only; it does not prove Cloudinary/local storage durability or browser preview rendering unless those are separately verified.

## AI workflow and costs

The suite checks provider status/read APIs when authenticated, but intentionally does not invoke a real image generation. Real provider runs can incur cost and consume quotas. Use a dedicated mock/staging provider or separately budgeted test credentials for end-to-end generation. The current report records the configured generator.

## Recycle / restore

The runner reads the recycle endpoint but does not mutate/restore records automatically. Restore testing should use a QA-only synthetic asset/identity created through the application's supported deletion flow, then assert the object is restored and the recycle entry disappears. This is deliberately not guessed against unknown upload/provider setup.

## Outputs and limitations

`qa/reports/phase2-qa-<timestamp>.json` and `.md`; optional screenshot `phase2-screenshot-<run-id>.png`.

A `WARN` means a check was skipped or optional setup was unavailable; it is not proof of a defect. `FAIL` means an executed assertion failed. The runner never patches application source automatically. Review suggested fixes and apply them through normal version control/review.
