import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import config from './config.js';
import { connectDB } from './db.js';
import { wrap, notFound, errorHandler } from './middleware/common.js';
import { requireAuth, login, me, signup, requestPasswordReset, resetPassword } from './middleware/auth.js';
import { runWithTenant } from './middleware/tenant.js';
import { ping } from './services/ollama.js';
import identities from './routes/identities.js';
import prompts from './routes/prompts.js';
import assets from './routes/assets.js';
import generations from './routes/generations.js';
import stats from './routes/stats.js';
import groups from './routes/groups.js';
import recycle from './routes/recycle.js';
import compile from './routes/compile.js';
import providers from './routes/providers.js';
import autonomy from './routes/autonomy.js';
import { seedDefaultGroups } from './routes/groups.js';
import team, { acceptInvitation } from './routes/team.js';

try { fs.mkdirSync(config.uploadDir, { recursive: true }); } catch { /* read-only fs */ }

const app = express();
app.set('trust proxy', 1);
app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : {}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(config.isVercel ? 'tiny' : 'dev'));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }));

// ---- Public: health + login ----
app.get('/api/health', wrap(async (req, res) => {
  // Live (Vercel) pe Ollama tabhi check karo jab OLLAMA_URL khud set ho
  const checkOllama = !config.isVercel || !!process.env.OLLAMA_URL;
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1,
    dbName: mongoose.connection.name,
    ollama: checkOllama ? await ping() : false,
    generator: config.generator.provider,
  });
}));
app.post('/api/auth/login', wrap(async (req,res) => { await connectDB(); return login(req,res); }));
app.post('/api/auth/signup', wrap(async (req,res) => { await connectDB(); return signup(req,res); }));
app.post('/api/auth/forgot-password', wrap(async (req,res) => { await connectDB(); return requestPasswordReset(req,res); }));
app.post('/api/auth/reset-password', wrap(async (req,res) => { await connectDB(); return resetPassword(req,res); }));
app.post('/api/team/invitations/accept', wrap(async (req,res) => { await connectDB(); return acceptInvitation(req,res); }));

// ---- Protected: login required, phir DB ready ----
const seededByOrganization = new Map();
const seedOnce = (orgId) => { const key = orgId || 'legacy-admin'; if (!seededByOrganization.has(key)) seededByOrganization.set(key, seedDefaultGroups().catch((e) => { seededByOrganization.delete(key); console.error('[seed]', e.message); })); return seededByOrganization.get(key); };
app.use('/api', requireAuth);
app.get('/api/auth/me', wrap(async (req,res) => { await connectDB(); return me(req,res); }));
app.use('/api', (req,res,next) => runWithTenant(req.organizationId, next));
app.use('/api', wrap(async (req, res, next) => { await connectDB(); await seedOnce(req.organizationId); next(); }));

app.use('/api/stats', stats);
app.use('/api/groups', groups);
app.use('/api/recycle', recycle);
app.use('/api/identities', identities);
app.use('/api/prompts', prompts);
app.use('/api/assets', assets);
app.use('/api/generations', generations);
app.use('/api/compile', compile);
app.use('/api/providers', providers);
app.use('/api/autonomy', autonomy);
app.use('/api/team', team);
// Render / Docker / local production: Express hi built client (client/dist) bhi serve karta hai
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (!config.isVercel && fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
