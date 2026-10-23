# Support Assistant Server

Backend for the Electron + React Support Assistant app.

## Quick start (Mac)

```bash
cd server
npm install
npm start
```

Server listens on **http://localhost:3000**

## First-time app flow

1. Start this server
2. Open the Support Assistant app
3. **Register** a new account (or login)
4. **Activate L1 plan** — paste:
   - AssemblyAI key (for live voice transcription)
   - At least one AI provider key (Groq / Gemini / OpenAI / Mistral)
5. Voice + text + screenshot will work

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/plan` | Plan status |
| POST | `/api/plan/activate-l1` | Activate BYOK plan |
| GET/PUT | `/api/profile` | Tech profile |
| GET | `/api/conversations` | History |
| POST | `/api/ai/text` | Text chat |
| POST | `/api/ai/screenshot` | Screenshot Q&A |
| WS | `/stream?token=` | Voice audio stream |

## Data

JSON files under `server/data/` (created automatically). No MongoDB required.

## Env

Copy `.env.example` → `.env` if needed. Defaults work for local dev.
