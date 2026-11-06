import Generation from '../models/Generation.js';
import config from '../config.js';
import { runGeneration } from './generationRunner.js';

const SERVERLESS = config.isVercel;
let active = 0;
let timer = null;
let stopping = false;
const runningIds = new Set();

async function workOne(doc) {
  active += 1;
  runningIds.add(String(doc._id));
  try {
    doc.status = 'running'; doc.currentStep = 'queue-started'; doc.error = undefined;
    await doc.save();
    await runGeneration(doc._id);
    const fresh = await Generation.findById(doc._id);
    if (fresh?.status === 'error' && fresh.retryCount < fresh.maxRetries && !fresh.cancelRequested) {
      fresh.retryCount += 1; fresh.status = 'queued'; fresh.progress = 0;
      fresh.currentStep = `retry-queued-${fresh.retryCount}`; fresh.error = undefined;
      await fresh.save();
    }
  } catch (error) {
    const fresh = await Generation.findById(doc._id).catch(() => null);
    if (fresh && !fresh.cancelRequested && fresh.retryCount < fresh.maxRetries) {
      fresh.retryCount += 1; fresh.status = 'queued'; fresh.progress = 0;
      fresh.currentStep = `retry-queued-${fresh.retryCount}`; fresh.error = error.message;
      await fresh.save();
    } else if (fresh) {
      fresh.status = 'error'; fresh.error = error.message; fresh.completedAt = new Date(); await fresh.save();
    }
  } finally {
    active -= 1; runningIds.delete(String(doc._id));
  }
}

// Serverless me restart-recovery nahi chalti (har cold start pe dusre instance ke running jobs na toote),
// isliye sirf wahi 'running' jobs wapas queue hote hain jo staleMs se zyada der se update nahi hue.
async function recoverStale() {
  const cutoff = new Date(Date.now() - config.queue.staleMs);
  const stale = await Generation.find({ status: 'running', updatedAt: { $lt: cutoff } });
  for (const g of stale) {
    if (g.retryCount < g.maxRetries) {
      g.retryCount += 1; g.status = 'queued'; g.progress = 0; g.currentStep = 'recovered-after-timeout';
    } else {
      g.status = 'error'; g.error = 'Generation timed out on the server'; g.completedAt = new Date();
    }
    await g.save();
  }
}

export async function pumpQueue() {
  if (stopping) return;
  if (SERVERLESS) await recoverStale();
  while (!stopping && active < config.queue.concurrency) {
    const next = await Generation.findOne({ status: 'queued', cancelRequested: { $ne: true } }).sort({ createdAt: 1 });
    if (!next) break;
    // Atomic claim prevents two pollers from starting the same job.
    const claimed = await Generation.findOneAndUpdate(
      { _id: next._id, status: 'queued', cancelRequested: { $ne: true } },
      { $set: { status: 'running', currentStep: 'queue-claimed' } }, { new: true }
    );
    if (!claimed) break;
    // Serverless: kaam response ke baad bhi chalta rahe (waitUntil), isliye yahin await karte hain.
    if (SERVERLESS) await workOne(claimed);
    else void workOne(claimed);
    continue;
  }
}

export function startGenerationQueue() {
  if (timer) return;
  stopping = false;
  timer = setInterval(() => pumpQueue().catch((e) => console.error('[generation-queue]', e.message)), config.queue.pollMs);
  timer.unref?.();
  void pumpQueue().catch((e) => console.error('[generation-queue]', e.message));
}

export async function recoverGenerationQueue() {
  await Generation.updateMany({ status: 'running' }, { $set: { status: 'queued', progress: 0, currentStep: 'recovered-after-restart' } });
  await Generation.updateMany({ status: 'queued', cancelRequested: true }, { $set: { status: 'cancelled', currentStep: 'cancelled' } });
}

export async function cancelGeneration(id) {
  const doc = await Generation.findById(id);
  if (!doc) return null;
  if (doc.status === 'queued') {
    doc.status = 'cancelled'; doc.cancelRequested = true; doc.currentStep = 'cancelled'; doc.completedAt = new Date();
  } else if (doc.status === 'running') {
    doc.cancelRequested = true; doc.currentStep = 'cancellation-requested';
  }
  await doc.save();
  return doc;
}

export async function stopGenerationQueue() {
  stopping = true;
  if (timer) clearInterval(timer);
  timer = null;
}
