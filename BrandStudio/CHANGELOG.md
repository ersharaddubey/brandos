# Changelog

## 2026-11-02 — Autonomous AI Company OS foundation
- Added a supervised multi-agent workspace at `/autonomy` with eight starter agent roles.
- Added MongoDB-backed task proposals, approvals/rejections, agent pause/resume and audit events.
- All autonomy endpoints inherit the existing authenticated `/api` middleware.
- Approval records authorization only; execution adapters, autonomous spending, self-deployment and self-replication remain disabled by design.
- Removed the bundled `server/.env` from the distributable archive; configure secrets locally from `.env.example`.

## 2026-11-02 — ImageKit → Cloudinary
- Image storage ImageKit se Cloudinary par shift (`services/storage.js`, `services/imageService.js`).
- Env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (ya single `CLOUDINARY_URL`). `IMAGEKIT_*` ab use nahi hote.
- `Asset.imageFileId` ab Cloudinary `public_id` store karta hai. Purane ImageKit URLs jab tak ImageKit account chalu hai tab tak load hote rahenge.
- `npm run backfill-images` ab `scripts/backfill-cloudinary.js` chalata hai.

## 2026-11-02 — Local-testing fixes

### Fixed
- `MONGODB_URI` ab `MONGO_URI` ka alias hai (pehle app silently localhost DB use karta tha).
- API image providers (fal/replicate/stability/ideogram/openai/together) pehle Studio se jude hi nahi the (`imageService.js` kahin mount nahi tha, aur ImageKit keys bina import crash karta). Ab `GENERATOR_PROVIDER=api` se chalte hain; single (`FAL_KEY`) aur plural (`FAL_KEYS`) env naam dono chalte hain; ImageKit lazy/optional.
- `.env` se asli keys hata di gayi, `.env.example` banaya, startup par default-password warning.

### Added
- Real video file generation (Studio → Video → *Generate video file*, fal.ai) — `POST /api/compile/generate-video`.
- `npm run doctor` — Mongo, Ollama models, provider, keys check.

## Vercel deploy + Login
- `api/index.js` + `vercel.json` + root `package.json`: single-project Vercel deploy (client static, API serverless).
- `server/src/app.js` (Express app, no listen) aur `index.js` (sirf local listen). Mongo connection cached.
- Uploads Vercel par `/tmp` me (cache), permanent copy ImageKit me.
- Generation queue / identity analysis serverless-safe (`waitUntil`, stale-job recovery).
- Login: `/api/auth/login`, signed token, sab `/api/*` protected; client me Login page + Sign out.
- `VITE_API_URL` optional (frontend alag host par ho to).


## 2026-10-31 — Images no longer disappear (ImageKit storage)

### Cause
- Images were saved only in `server/uploads` (local disk) while MongoDB kept the records. On every redeploy / restart on a host with temporary disk (or a fresh zip, where `uploads/` is empty) the files vanished but the DB rows stayed, so images broke.
- ImageKit was only wired into `/services/imageService.js`, which no route in `index.js` mounted, so it was never actually used.

### Fixed
- New `services/storage.js`: every stored image (uploads, references, generated, extracted layers) is now also uploaded to ImageKit; `asset.url` returns the ImageKit URL.
- If a local file is missing, it is restored from ImageKit automatically (fixes "Reference image file missing on disk").
- Deleting an asset permanently also deletes the ImageKit copy.
- `npm run backfill-images` (in `server/`) uploads already-existing local images to ImageKit once.
- Without `IMAGEKIT_*` env vars the app keeps working with local disk only (with a console warning).
- `.env.example` contained real API keys; replaced with placeholders.

## 2026-10-31 — Design & colour fix

### Colours
- One palette, defined only in `:root` of `client/src/index.css` (iOS dark: blue `#0a84ff`, indigo `#5e5ce6`).
- Removed leftover old-theme colours (periwinkle, violet, slate greys, pastel Tailwind tints) from CSS and JSX.
- New tokens: `--accent-text`, `--accent-soft`, `--accent-line`, `--good/warn/bad-soft`, `--bad-text`, `--code-text`, `--track`.
- Each identity type has one colour (`--t-product`, `--t-character`, `--t-brand`, `--t-environment`, `--t-style`, `--t-voice`, `--t-motion`).
- Muted text and link blue brightened for contrast on dark surfaces.
- Logo, favicon and page title match the new palette.

### Design
- Prompt OS: removed old neumorphic styles and bouncy hover; cards, tabs and panels now match the rest of the app.
- Sentence-case form labels (no more all-caps); sidebar tagline no longer wraps.
- Cards use hairline borders instead of heavy shadows; segmented tabs share one style.
- Styled file-upload button; quieter "Delete image" button with an SVG icon instead of an emoji.
- Tighter, more consistent spacing under page headers and help text.
- Removed duplicate/conflicting CSS rules.

### Fixed
- Mobile: the hidden sidebar took up a full screen, so pages looked blank. Drawer and menu button are now truly fixed.

## 2026-10-30 — Studio Video Generate redesign

### Fixed / Added
- **Video Generate** ab alag professional flow hai (Image se copy-paste nahi)
- Reference **video upload** + browser preview
- **Timestamp start / end** for segment selection
- **Extract what** field (style, voice, motion, character…)
- Duration + Motion language clearly labeled
- Generate Video builds a full structured prompt from:
  - selected identity locks
  - campaign brief
  - optional reference video + timestamps
- Result panel shows full copy-ready prompt (for Runway / Kling / Luma)
- Image ad-hoc upload clarified (stills only); video ref lives inside Video tab
- Mode switch resets video result



## 2026-10-30 — Prompt OS Image / Video separate tabs

### Changed
- Prompt OS now has two clear top-level tabs:
  - **Prompt OS Image**
  - **Prompt OS Video**
- Each tab shows only its relevant type locks and templates
- Fill dummy prompts is mode-aware (Image tab fills image templates, Video tab fills video templates)
- Library list filtered by active tab



## 2026-10-30 — Full Video Prompt OS parity

### Added
- Prompt OS now has clear **IMAGE** and **VIDEO** groups
- **Style** and **Voice** available in both Image and Video
- **Motion** dedicated to Video
- New Video prompt templates:
  - Video - Full Campaign
  - Video - From Timestamp
  - Video - Product Focus
  - Video - Character Performance
- Support for `{{timestamps}}` variable in video prompts
- Same identity locks (Product, Character, Brand, Environment, Style, Voice, Motion) usable for both image and video generation flow

### Design
- Upload video + optional timestamps → extract Style / Voice / Motion / Character etc. → Lock → Prompt → Generate Video
- Mirrors the existing Image flow as closely as possible



## 2026-10-30 — Prompt OS: Image vs Video groups + Voice

### Added / Changed
- Prompt OS type cards now split into two clear categories:
  - **IMAGE**: Product · Character · Brand · Environment · Style · Voice
  - **VIDEO**: Motion
- Renamed **Tone** → **Voice** (better reusable name for campaign emotional + messaging system)
- Motion kept exclusively under Video group



## 2026-10-30 — Style / Tone / Motion locks

### Added
- Three new Identity Lock types for advertising agencies:
  - **style** — lighting, color grade, composition rules, texture
  - **tone** — campaign brief, emotional rules, voice, forbidden claims
  - **motion** — camera language, edit rhythm, transitions, body dynamics
- Full lockSchema field groups + FIELD_HINTS for the new types
- PromptOS dummy templates for Style Lock, Voice Lock, Motion Lock
- promptCompiler builders and TYPE_NEGATIVE entries for the new types
- UI labels updated across Identities, Studio, PromptOS, Asset Bank, Open Shelf, Dashboard

### Changed
- Identity type enum expanded from 4 → 7 everywhere (models, routes, client filters)



## 2026-10-24 — Studio reference UX + ad-hoc upload

### Added
- **Studio selected strip** always visible (even when empty).
- **“+ Add reference…”** dropdown chip: lists remaining locked identities as `type · name`.
  - Removes the previous “no 4th slot” friction after selecting 3 identities.
  - Works whether you select 1, 2, 3 or all 4+ identities.
- Selected chips + dropdown options sorted by type order (character → product → brand → environment) to match the prompt compiler.
- CSS for dashed `add-chip`.
- Root `README.md` with setup + Studio usage notes.
- **Ad-hoc upload box** (neeche selected-strip ke baad): type select (product / brand / character / environment) + optional name + image upload.
  - Studio se seedha naya reference bana sakte ho.
  - Identity create + analysis start hoti hai; Lock karne ke baad + Add reference se select karke purani + nayi dono use kar sakte ho.

### Changed
- Tour step & page subtitle text updated to describe unlimited selection and the + control.
- Help copy under the identity grid clarifies multi-select and the + button.

### Notes
- Ad-hoc upload creates identity (status analyzing). After analysis, go to Identity Lock → Lock, then return to Studio and select via + Add reference.
- Multiple references per identity remain available on Identity Detail → “Add another reference”.
