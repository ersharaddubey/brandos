import { Router } from 'express';
import Identity from '../models/Identity.js';
import Asset from '../models/Asset.js';
import RecycleBin from '../models/RecycleBin.js';
import { wrap, upload } from '../middleware/common.js';
import { ingestImage, removeAssetFile } from '../services/assets.js';
import { analyzeIdentity } from '../services/identityAnalyzer.js';
import { PROFILE_KEYS, clientSchema, computeLockStats } from '../services/lockSchema.js';
import {
  extractIdentityLayersFromAsset,
  extractIdentityLayersFromBuffer,
} from '../services/extractIdentityLayers.js';

const r = Router();
const withRefs = (q) => q.populate('referenceAssetIds');

r.get('/meta/keys', (req, res) => res.json(PROFILE_KEYS));
r.get('/meta/schema', (req, res) => res.json(clientSchema()));

r.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  res.json(await withRefs(Identity.find(filter).sort('-createdAt')));
}));

/**
 * One image → up to 4 identity layers (product, character, environment, brand).
 * Body (multipart): image, optional types (comma list), namePrefix, visibility, createIdentities
 * Or JSON: { assetId, types?, namePrefix?, visibility?, createIdentities? }
 */
r.post(
  '/extract-all',
  upload.single('image'),
  wrap(async (req, res) => {
    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    const createIdentities = req.body?.createIdentities !== 'false' && req.body?.createIdentities !== false;
    const namePrefix = String(req.body?.namePrefix || '').trim();
    let types;
    if (req.body?.types) {
      types = String(req.body.types)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    let out;
    if (req.file?.buffer) {
      out = await extractIdentityLayersFromBuffer({
        buffer: req.file.buffer,
        types,
        createIdentities,
        visibility,
        namePrefix,
      });
    } else if (req.body?.assetId) {
      out = await extractIdentityLayersFromAsset({
        assetId: req.body.assetId,
        types,
        createIdentities,
        visibility,
        namePrefix,
      });
    } else {
      return res.status(400).json({ error: 'Provide an image file or assetId' });
    }

    // Re-fetch identities with refs for client
    const identityIds = out.results.map((r) => r.identity?._id).filter(Boolean);
    const identities = identityIds.length
      ? await withRefs(Identity.find({ _id: { $in: identityIds } }))
      : [];
    const byId = Object.fromEntries(identities.map((i) => [String(i._id), i]));

    res.status(201).json({
      ...out,
      results: out.results.map((r) => ({
        ...r,
        identity: r.identity ? byId[String(r.identity._id)] || r.identity : null,
      })),
    });
  })
);

r.get('/:id', wrap(async (req, res) => {
  const doc = await withRefs(Identity.findById(req.params.id));
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  res.json(doc);
}));

// Create: upload reference -> async "understand" step -> user reviews -> Lock
r.post('/', upload.single('image'), wrap(async (req, res) => {
  const { name, type, description, visibility } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  if (!req.file) return res.status(400).json({ error: 'Reference image is required' });
  const vis = visibility === 'public' ? 'public' : 'private';
  const { asset } = await ingestImage({ buffer: req.file.buffer, kind: 'reference', visibility: vis, category: type });
  const doc = await Identity.create({ name, type, description, referenceAssetIds: [asset._id], status: 'analyzing' });
  await Asset.updateOne({ _id: asset._id }, { $addToSet: { identityIds: doc._id } });
  analyzeIdentity(doc._id).catch(console.error);
  res.status(201).json(await withRefs(Identity.findById(doc._id)));
}));

r.post('/:id/reference', upload.single('image'), wrap(async (req, res) => {
  const doc = await Identity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  if (!req.file) return res.status(400).json({ error: 'Image required' });
  const { asset } = await ingestImage({ buffer: req.file.buffer, kind: 'reference', identityIds: [doc._id] });
  doc.referenceAssetIds.addToSet(asset._id);
  await doc.save();
  res.json(await withRefs(Identity.findById(doc._id)));
}));

r.put('/:id', wrap(async (req, res) => {
  const doc = await Identity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  if (doc.status === 'locked') return res.status(409).json({ error: 'Unlock the identity before editing' });
  const { name, description, profile, rules, anchors } = req.body;
  if (name !== undefined) doc.name = name;
  if (description !== undefined) doc.description = description;
  if (profile !== undefined) { doc.profile = profile; doc.markModified('profile'); }
  if (rules !== undefined) doc.rules = rules.map((x) => String(x).trim()).filter(Boolean);
  if (anchors !== undefined) doc.anchors = anchors.map((x) => String(x).trim()).filter(Boolean);
  await doc.save();
  res.json(await withRefs(Identity.findById(doc._id)));
}));

r.post('/:id/lock', wrap(async (req, res) => {
  const doc = await Identity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  const filled = Object.values(doc.profile || {}).some((v) => String(v).trim());
  if (!filled) return res.status(400).json({ error: 'Profile is empty - fill it or re-run analysis first' });
  doc.history.push({ version: doc.version, profile: doc.profile, rules: doc.rules, anchors: doc.anchors, lockPercent: computeLockStats(doc).percent });
  doc.version += 1;
  doc.status = 'locked';
  await doc.save();
  res.json(await withRefs(Identity.findById(doc._id)));
}));

r.post('/:id/unlock', wrap(async (req, res) => {
  const doc = await Identity.findByIdAndUpdate(req.params.id, { status: 'draft' }, { new: true });
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  res.json(await withRefs(Identity.findById(doc._id)));
}));

r.post('/:id/reanalyze', wrap(async (req, res) => {
  const doc = await Identity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Identity not found' });
  if (doc.status === 'locked') return res.status(409).json({ error: 'Unlock first' });
  doc.status = 'analyzing';
  await doc.save();
  analyzeIdentity(doc._id).catch(console.error);
  res.json(await withRefs(Identity.findById(doc._id)));
}));

r.delete('/:id', wrap(async (req, res) => {
  const doc = await Identity.findById(req.params.id);
  if (!doc) return res.json({ ok: true });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Move identity to Recycle Bin (files kept for restore)
  await RecycleBin.create({
    kind: 'identity',
    originalId: doc._id,
    snapshot: doc.toObject(),
    reason: 'identity-delete',
    expiresAt,
  });

  // Also move its reference assets into bin so they leave active lists
  for (const aid of doc.referenceAssetIds || []) {
    const a = await Asset.findById(aid);
    if (!a) continue;
    await RecycleBin.create({
      kind: 'asset',
      originalId: a._id,
      snapshot: a.toObject(),
      reason: `identity-delete:${doc.name}`,
      expiresAt,
    });
    await Asset.findByIdAndDelete(a._id);
  }

  await Identity.findByIdAndDelete(doc._id);
  res.json({ ok: true, message: 'Identity moved to Recycle Bin for 24 hours.' });
}));

export default r;
