# CosmoLive (MERN)
Landing site + auth + operator dashboard (simulated live telemetry) + admin panel.

## Run
1. MongoDB chalu rakho (local ya Atlas).
2. Server:  cd server && cp .env.example .env && npm i && npm run seed && npm run dev   (port 5000)
3. Client:  cd client && npm i && npm run dev   (port 5173, /api proxy to 5000)

Seed admin: admin@cosmolive.io / Admin@123  (change after first login)

## API
POST /api/auth/register | /api/auth/login | GET /api/auth/me
POST /api/waitlist (public) | GET /api/waitlist (admin)
GET  /api/satellites | POST /api/satellites (admin) | GET /api/satellites/:id/telemetry
Telemetry abhi simulated hai; real operator feed ke liye server/index.js me telemetry() replace karo.
