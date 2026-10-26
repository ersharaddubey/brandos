# Brand OS — Investor brief (React + Vite)

Single-page site in professional US English.

## Local

```bash
cd brandos-site
npm install
npm run dev
```

## Deploy on Vercel

### Option A — Dashboard (easiest)

1. Push this folder to a GitHub repo (or upload the project).
2. Go to [https://vercel.com/new](https://vercel.com/new) and sign in.
3. **Import** the repo (or use “Add New… → Project”).
4. Vercel should detect **Vite**. Confirm:
   - **Framework Preset:** Vite  
   - **Build Command:** `npm run build`  
   - **Output Directory:** `dist`  
   - **Install Command:** `npm install`
5. Click **Deploy**. You get a URL like `https://brandos-xxxx.vercel.app`.

### Option B — Vercel CLI

```bash
cd brandos-site
npm install
npm i -g vercel
vercel login
vercel
# production:
vercel --prod
```

`vercel.json` is included so routing and build settings work out of the box.

## Sections

Hero → Problem → Solution → Industries → Build requirements → Testing (3–6 months) → Why invest → IP
