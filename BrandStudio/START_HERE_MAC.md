# BrandStudio — Mac local start

You are already inside the `BrandStudio` folder when your terminal prompt ends with `BrandStudio %`. Do not run `cd BrandStudio` again.

## 1. Backend (Terminal 1)
```bash
cd server
cp .env.example .env   # only if server/.env does not already exist
npm install
npm run dev
```
Ensure MongoDB is running and `MONGO_URI` in `server/.env` points to it. The API defaults to port 5002.

## 2. Frontend (Terminal 2)
Open a second terminal window/tab, then from the project root:
```bash
cd /path/to/BrandStudio/client
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` to http://localhost:5002.

## 3. Signup
Use **Create an organization account**. Set a work email, organization name, name, and password of at least 12 characters.

## 4. Existing admin login
The legacy admin login reads `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `server/.env`; set your own values.

## Troubleshooting
- `hashPassword` export error: fixed in this package; `team.js` imports it from `middleware/passwords.js`.
- `ECONNREFUSED /api/auth/login`: backend is not listening. Start the backend first and check that port 5002 is free.
- `cd: no such file or directory: BrandStudio`: you are already in the project root; use `cd server` or `cd client`.

## Run the complete self-test suite

Keep MongoDB and the application servers running, then from the project root run:

```bash
npm run test:all
```

This runs Node syntax checks, backend unit tests, a frontend production build, and the live API/browser/module QA suites. Reports are saved under `qa/reports/`. The live suite expects the API at port 5002 and Vite at port 5173 unless `QA_API_URL` / `QA_BASE_URL` are configured. Install Playwright's browser once with `npx playwright install chromium` if browser checks report that Chromium is unavailable.

For synthetic create/update/delete tests, use a separate database named with `qa` or `test`, set `QA_MONGODB_URI` and `QA_ALLOW_DESTRUCTIVE=true`, and never point these settings at production.
