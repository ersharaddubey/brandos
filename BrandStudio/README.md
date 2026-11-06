# brandstudio — brandstudio Platform

Lock product · character · brand · environment identities once, then generate consistent images & videos across campaigns.

## Stack

| Layer | Tech |
|-------|------|
| Client | React 18 + Vite + Tailwind |
| API | Express + Mongoose |
| DB | MongoDB |
| Vision / LLM | Ollama (optional) |
| Generation | Mock / ComfyUI / A1111 / InvokeAI / fal etc. |

## Local testing (Ollama + local MongoDB) — recommended pehla step

```bash
# 0) Ollama models (ek baar)
ollama pull qwen3:8b
ollama pull qwen3-vl:8b-instruct
ollama pull nomic-embed-text       # optional: semantic search ke liye

# 1) MongoDB local chalu (brew services start mongodb-community)  |  2) install
cd server && cp .env.example .env   # ya diya hua .env use karo, ADMIN_PASSWORD wahin hai
npm install && npm run doctor       # sab kuch check karta hai (Mongo, Ollama models, provider, keys)
npm run dev                         # http://localhost:5002

cd ../client && npm install && npm run dev   # http://localhost:5173
```

Image provider (`server/.env` → `GENERATOR_PROVIDER`):
- `pollinations` — free, key nahi chahiye (internet chahiye). Default.
- `api` — fal / replicate / stability / ideogram / openai / together (keys bharo, order `IMAGE_PROVIDER_ORDER`). Reference images API providers ko nahi jaati; identity details prompt me jaati hain. Aspect ratio sirf fal aur openai me follow hota hai.
- `comfyui` / `a1111` / `invokeai` — local GPU (identity ke liye sabse behtar).
- `mock` — sirf UI test.

**Video:** Studio → Video tab → prompt banao → **Generate video file** (fal.ai, `FAL_KEY` chahiye, model `VIDEO_FAL_MODEL`). Text-to-video; 1–3 minute lag sakte hain.

> Secrets kabhi zip/git me mat bhejo. `server/.env` ignore hota hai; sirf `.env.example` share karo.

## Quick start

```bash
# 1. MongoDB running on localhost:27017
# 2. (Optional) Ollama with a vision model

cd server
cp .env.example .env          # edit keys / GENERATOR_PROVIDER=mock for local test
npm install
npm run dev                   # → http://localhost:5002

cd ../client
npm install
npm run dev                   # → http://localhost:5173  (proxies /api & /uploads)
```

Open http://localhost:5173 → **Identity Lock** → upload reference → Lock → **Studio**.

## Studio — Reference selection (updated)

- Select any number of **locked** identities (product + character + brand + environment, or multiple of the same type).
- Selected chips always show at the bottom with **type badge**.
- **+ Add reference…** dropdown lists remaining locked identities as `type · name` — no 3-item limit.
- Chips are ordered the same way the prompt compiler uses: character → product → brand → environment.
- Click **×** on a chip (or the card) to deselect.
- **Ad-hoc upload box** (strip ke neeche): type (brand / product / character / environment) select karo + image upload. Naya identity ban jata hai; analyse + Lock ke baad wapas Studio mein select kar sakte ho — purani + nayi dono saath use karke perfect banao.

This fixes the previous UX gap where after selecting 3 identities there was no clear way to add a 4th, and where type was not obvious when adding more. Ad-hoc upload se Studio se hi naya reference add ho sakta hai.

## Main flows

1. **Identity Lock** (`/identities`)  
   - Single reference upload + type, or  
   - “Extract all from one image” (product / character / environment / brand layers).
2. **Studio** (`/studio`)  
   - Pick locked identities → campaign brief → Compile / Generate Image or Video.
3. **Asset Bank / Open Shelf** — private vs shared reference storage.
4. **Check** — consistency score against locked identity.
5. **Prompt OS / Workflow Builder** — templates & graphs.

## Generator providers

Set `GENERATOR_PROVIDER` in `server/.env`:

- `mock` — no external GPU, returns placeholder (good for UI testing)
- `comfyui` — local ComfyUI + InstantID / IP-Adapter workflows
- `a1111`, `invokeai`, etc. (see `.env.example`)

## Project layout

```
brandstudio/
  client/          React app
  server/          Express API + services
  flux-server/     Optional FLUX helper
  transformers-service/  Optional grounding / SAM
  colab/           Colab notebooks
  docker-compose.integrations.yml
```

## Notes

- Only **locked** identities appear in Studio.
- Multiple references per identity are supported via Identity Detail → “Add another reference”.
- For full consistency, lock one identity per type you care about, then select the combination in Studio.

## Image storage (Cloudinary)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (or a single `CLOUDINARY_URL`) in `server/.env` (also in your hosting dashboard's environment variables). All images are saved to Cloudinary; `server/uploads` is just a cache. Existing local images: `cd server && npm run backfill-images`.

## Login

Poora app ab login ke peeche hai (server-side token check, sirf UI hide nahi).

- Username/password `server/.env` me set hote hain (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Code me koi password README me nahi likha — apna khud rakho.
- Badalne ke liye `ADMIN_USERNAME`, `ADMIN_PASSWORD` aur `AUTH_SECRET` env vars set karo (local `server/.env` ya Vercel dashboard).

## Deploy on Vercel (live)

Ek hi Vercel project: `client/` static build + `api/index.js` serverless Express (`/api/*`). Same domain, isliye CORS / proxy ki zaroorat nahi.

1. **MongoDB Atlas** cluster banao, Network Access me `0.0.0.0/0` allow karo, connection string copy karo.
2. **Cloudinary** account (Dashboard → API Keys) se cloud name, API key, API secret lo (live par images sirf yahin permanent save hoti hain; Vercel ka disk temporary hai).
3. Repo ko GitHub par push karo → Vercel → *Add New Project* → repo import. Root Directory = repo root (`brandstudio/`). Framework = *Other*. Build settings `vercel.json` se aa jaati hain.
4. *Settings → Environment Variables* me daalo:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Atlas connection string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | login credentials |
| `AUTH_SECRET` | lambi random string |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary keys |
| `GENERATOR_PROVIDER` | `pollinations` (free) ya jo provider use karna ho + uski API key |
| `OLLAMA_URL` | sirf agar Ollama kahin hosted hai (localhost live par kaam nahi karta) |

5. Deploy. Baad me env var badlo to *Redeploy* karna padta hai.

Live par kya alag hai:
- Background kaam (image generation, identity analysis) `waitUntil` se response ke baad chalta hai; max time `vercel.json` me `maxDuration: 300`.
- Upload limit Vercel ki taraf se ~4.5 MB per request.
- Localhost services (Ollama, ComfyUI, A1111, Qdrant, n8n…) Vercel se connect nahi ho sakti — hosted URL do ya unhe off rakho.

## Deploy on Render (recommended for full features)

Render par normal Node server chalta hai: queue, lambe jobs, badi uploads sab bina Vercel ki limits ke.

1. Repo GitHub par push karo.
2. Render → *New → Blueprint* → repo select (`render.yaml` apne aap padh leta hai). Ya manually: Web Service, Build `npm --prefix client install && npm --prefix client run build && npm --prefix server install`, Start `npm --prefix server start`.
3. Env vars bharo: `MONGO_URI` (Atlas), `ADMIN_PASSWORD`, Cloudinary ki 3 keys. `AUTH_SECRET` auto-generate hota hai.
4. Atlas Network Access me `0.0.0.0/0` allow karo.
5. Ek hi URL par app + API dono chalte hain.

Note: Render ka disk redeploy par wipe hota hai (images Cloudinary me safe hain). Ollama / ComfyUI jaisi GPU services Render par nahi chalti — unke liye hosted provider ya alag GPU host chahiye.

## Deploy on Koyeb (Docker)

`Dockerfile` ek hi image me client build + Express API banata hai (port 8000, low-memory mode ON).

1. Repo GitHub par push karo → Koyeb → *Create Service → Web Service → GitHub* → repo select.
2. Builder: **Dockerfile** (root `Dockerfile`). Instance: Free. Region: Frankfurt / Washington.
3. Port: `8000` (HTTP). Health check path: `/api/health`.
4. Environment variables: `MONGO_URI` (MongoDB Atlas, Network Access `0.0.0.0/0`), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GENERATOR_PROVIDER=pollinations`.
5. Deploy. Free instance ~1 ghante bina traffic ke sleep ho jata hai; pehli request par thoda wait lagta hai.

Local Docker test: `docker build -t brandstudio . && docker run -p 8000:8000 --env-file server/.env brandstudio`


## Autonomous AI Company OS (supervised foundation)

The `/autonomy` workspace adds a guarded multi-agent operating layer alongside BrandStudio:

- AI CEO, Research, Product, Engineering, Marketing, Sales, Support and Finance agent profiles.
- Persistent task proposals, owner approval/rejection, agent pause/resume and an audit trail in MongoDB.
- Risk labels and a visible human-approval policy.
- API routes are protected by the existing login middleware.

**Important:** this release is a supervised control plane, not a self-running company. Agent profiles are role definitions; they do not independently reason or execute tasks yet. Approving a proposal records the decision only. No arbitrary code execution, self-replication, autonomous spending, external outreach or production deployment is enabled. Connect narrowly scoped model/tool adapters only after defining permissions, budgets, audit logging, rollback and explicit approval gates.

Open **Autonomous AI OS** in the sidebar after logging in. Submit a task proposal, then approve or reject it from the work queue. Data persists in the configured MongoDB database.


## Phase 2 QA (browser + API lifecycle)

See [`qa/PHASE2.md`](qa/PHASE2.md). Run `npm run qa:phase2` for route/API checks, optional Playwright runtime checks and screenshots, plus guarded synthetic Prompt OS CRUD/version history and an explicitly configured QA upload endpoint. Run `npm run qa:all` to run all three QA suites. Destructive tests are opt-in and must use a dedicated QA/test database; real AI generation is not launched automatically.
