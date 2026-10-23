import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import config from './config.js';
import { connectDB } from './db.js';
import { notFound, errorHandler } from './middleware/common.js';
import { ping } from './services/ollama.js';
import Identity from './models/Identity.js';
import identities from './routes/identities.js';
import prompts from './routes/prompts.js';
import assets from './routes/assets.js';
import generations from './routes/generations.js';
import stats from './routes/stats.js';
import groups, { seedDefaultGroups } from './routes/groups.js';
import recycle from './routes/recycle.js';
import compile from './routes/compile.js';
import providers from './routes/providers.js';
import { recoverGenerationQueue, startGenerationQueue } from './services/generationQueue.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }));

app.get('/api/health', async (req, res) =>
  res.json({ ok: true, ollama: await ping(), generator: config.generator.provider, models: config.ollama })
);
app.use('/api/stats', stats);
app.use('/api/groups', groups);
app.use('/api/recycle', recycle);
app.use('/api/identities', identities);
app.use('/api/prompts', prompts);
app.use('/api/assets', assets);
app.use('/api/generations', generations);
app.use('/api/compile', compile);
app.use('/api/providers', providers);
app.use(notFound);
app.use(errorHandler);

// Server restart hone par jo analysis beech me ruk gaya tha wo hamesha 'analyzing' na dikhe
const recoverStuck = () =>
  Identity.updateMany(
    { status: 'analyzing' },
    { $set: { status: 'error', analysisError: 'Server restarted during analysis — use Re-analyse' } }
  );

connectDB()
  .then(recoverStuck)
  .then(recoverGenerationQueue)
  .then(() => seedDefaultGroups())
  .then(() => app.listen(config.port, () => { startGenerationQueue(); console.log(`API ready on http://localhost:${config.port}  (generator: ${config.generator.provider})`); }))
  .catch((e) => {
    console.error('Failed to start:', e.message);
    process.exit(1);
  });