# Support Assistant — Complete Build Guide (Mac)

Folders:
```
complete/
  server/     ← Node API + WebSocket (port 3000)
  src/        ← React frontend (Vite)
  electron/   ← Electron shell → builds .app / .dmg
```

---

## A. First-time setup

### 1) Server start (hamesha pehle)

```bash
cd ~/Desktop/complete/server
npm install
npm start
```

Leave this terminal open. You should see:
```
🚀 Support Assistant server on http://localhost:3000
```

Test:
```bash
curl http://localhost:3000/health
```

---

### 2) Frontend build (UI for packaged app)

**New terminal:**

```bash
cd ~/Desktop/complete/src
npm install
npm run build
```

Copy UI into Electron:

```bash
mkdir -p ../electron/renderer
rm -rf ../electron/renderer/*
cp -R dist/* ../electron/renderer/
ls ../electron/renderer
# must show: index.html  assets/  ...
```

---

### 3) Electron Mac app build

```bash
cd ~/Desktop/complete/electron
npm install
npm run dist -- --mac
```

Output:
```
electron/dist/Support Assistant-1.0.0-arm64.dmg
electron/dist/mac-arm64/Support Assistant.app
```

Install:
```bash
rm -rf "/Applications/Support Assistant.app"
open dist/Support\ Assistant-1.0.0-arm64.dmg
# drag app to Applications, then:
open -a "Support Assistant"
```

First open: Right-click → Open (Gatekeeper), if blocked.

---

## B. Daily development (without rebuilding DMG)

Terminal 1 — server:
```bash
cd ~/Desktop/complete/server && npm start
```

Terminal 2 — frontend Vite:
```bash
cd ~/Desktop/complete/src && npm run dev
```

Terminal 3 — Electron (loads http://localhost:5173):
```bash
cd ~/Desktop/complete/electron && npm start
```

---

## C. App usage flow

1. Server running on `:3000`
2. Open app → **Register** (email + password)
3. **Activate Plan (L1)**:
   - AssemblyAI API key (voice transcription)
   - At least one AI key: Groq / Gemini / OpenAI / Mistral
4. Use Voice / Text / Screenshot

---

## D. If blank screen

```bash
ls ~/Desktop/complete/electron/renderer/index.html
```
If missing → repeat step A.2 (frontend build + copy), then rebuild DMG (A.3).

## E. If "Failed to fetch"

Server not running. Start server (A.1).

## F. Rebuild after code changes

| Changed | What to run |
|---------|-------------|
| `server/` | restart `npm start` only |
| `src/` (UI) | `npm run build` → copy to `electron/renderer` → rebuild DMG if packaging |
| `electron/` | `npm run dist -- --mac` |

---

## Ports

| Service | Port |
|---------|------|
| Server API + WS | 3000 |
| Vite dev | 5173 |
