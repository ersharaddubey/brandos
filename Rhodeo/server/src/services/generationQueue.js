import Generation from '../models/Generation.js';
import config from '../config.js';
import { runGeneration } from './generationRunner.js';

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

export async function pumpQueue() {
  if (stopping) return;
  while (!stopping && active < config.queue.concurrency) {
    const next = await Generation.findOne({ status: 'queued', cancelRequested: { $ne: true } }).sort({ createdAt: 1 });
    if (!next) break;
    // Atomic claim prevents two pollers from starting the same job.
    const claimed = await Generation.findOneAndUpdate(
      { _id: next._id, status: 'queued', cancelRequested: { $ne: true } },
      { $set: { status: 'running', currentStep: 'queue-claimed' } }, { new: true }
    );
    if (claimed) void workOne(claimed);
    else break;
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
