// Local / Docker / Render / Railway entry. (Vercel ke liye ../../api/index.js use hota hai — wahan app.listen nahi chalta.)
import sharp from 'sharp';
import app from './app.js';
import config from './config.js';
import { connectDB } from './db.js';
import Identity from './models/Identity.js';
import { seedDefaultGroups } from './routes/groups.js';
import { recoverGenerationQueue, startGenerationQueue } from './services/generationQueue.js';

// Chhoti RAM (Koyeb free 512 MB): sharp ko ek thread / bina cache ke chalao
if (process.env.LOW_MEMORY === 'true') { sharp.cache(false); sharp.concurrency(1); }

// Server restart hone par jo analysis beech me ruk gaya tha wo hamesha 'analyzing' na dikhe
const recoverStuck = () =>
  Identity.updateMany(
    { status: 'analyzing' },
    { $set: { status: 'error', analysisError: 'Server restarted during analysis — use Re-analyse' } }
  );

if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'brandstudio@Studio#2026') {
  console.warn('[security] ADMIN_PASSWORD set nahi / default hai — server/.env me apna password rakho (live deploy se pehle zaroori).');
}

connectDB()
  .then(recoverStuck)
  .then(recoverGenerationQueue)
  .then(() => seedDefaultGroups())
  .then(() => app.listen(config.port, () => { startGenerationQueue(); console.log(`API ready on http://localhost:${config.port}  (generator: ${config.generator.provider})`); }))
  .catch((e) => {
    console.error('Failed to start:', e.message);
    process.exit(1);
  });
