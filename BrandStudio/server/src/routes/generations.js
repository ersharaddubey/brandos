import { Router } from 'express';
import Generation from '../models/Generation.js';
import Campaign from '../models/Campaign.js';
import { wrap } from '../middleware/common.js';
import { cancelGeneration, pumpQueue } from '../services/generationQueue.js';
import config from '../config.js';
import { runInBackground } from '../services/background.js';

const r = Router();
const populate = (q) => q.populate('attempts.assetId').populate('campaignId', 'name');

r.get('/', wrap(async (req, res) => {
  const list = await populate(Generation.find().sort('-createdAt').limit(30));
  // Serverless: koi queued job atak gayi ho to list refresh par dobara kick karo
  if (config.isVercel && list.some((g) => g.status === 'queued' || g.status === 'running')) runInBackground(pumpQueue());
  res.json(list);
}));

r.get('/:id', wrap(async (req, res) => {
  const doc = await populate(Generation.findById(req.params.id));
  if (!doc) return res.status(404).json({ error: 'Generation not found' });
  res.json(doc);
}));

r.delete('/:id', wrap(async (req, res) => {
  const doc = await Generation.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Generation not found' });
  res.json({ ok: true, id: req.params.id });
}));

r.post('/', wrap(async (req, res) => {
  const { identityIds, campaignName, goal, scene, composition, style, templateId, aspectRatio, width, height, avoid, focus, maxAttempts = 3, threshold = 75 } = req.body;
  if (!Array.isArray(identityIds) || !identityIds.length) return res.status(400).json({ error: 'Select at least one locked identity' });
  let campaignId;
  if (campaignName?.trim()) {
    const c = await Campaign.findOneAndUpdate(
      { name: campaignName.trim() },
      { $set: { goal, identityIds } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    campaignId = c._id;
  }
  const gen = await Generation.create({
    identityIds, campaignId,
    inputs: { goal, scene, composition, style, templateId: templateId || undefined, aspectRatio, width, height, avoid, focus: focus || undefined },
    status: 'queued', progress: 0, currentStep: 'queued',
    maxRetries: Math.max(0, Math.min(Number(req.body.maxRetries ?? config.queue.maxRetries), 5)),
    settings: { maxAttempts: Math.min(Math.max(Number(maxAttempts) || 3, 1), 6), threshold: Math.min(100, Math.max(1, Number(threshold) || 75)) },
  });
  runInBackground(pumpQueue());
  res.status(202).json(gen);
}));

// Cancel queued work immediately or request cooperative cancellation of a running generation.
r.post('/:id/cancel', wrap(async (req, res) => {
  const doc = await cancelGeneration(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Generation not found' });
  res.json(doc);
}));

// Retry a completed/failed/cancelled generation by cloning its original inputs into a fresh queue item.
r.post('/:id/retry', wrap(async (req, res) => {
  const old = await Generation.findById(req.params.id);
  if (!old) return res.status(404).json({ error: 'Generation not found' });
  if (['queued', 'running'].includes(old.status)) return res.status(409).json({ error: 'Generation is already queued or running' });
  const fresh = await Generation.create({ campaignId: old.campaignId, identityIds: old.identityIds, inputs: old.inputs.toObject ? old.inputs.toObject() : old.inputs, settings: old.settings.toObject ? old.settings.toObject() : old.settings, status: 'queued', progress: 0, currentStep: 'queued', maxRetries: old.maxRetries ?? 1 });
  runInBackground(pumpQueue());
  res.status(202).json(fresh);
}));

export default r;
