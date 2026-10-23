import { Router } from 'express';
import AssetGroup from '../models/AssetGroup.js';
import Asset from '../models/Asset.js';
import RecycleBin from '../models/RecycleBin.js';
import { wrap } from '../middleware/common.js';
import { removeAssetFile } from '../services/assets.js';

const r = Router();
const TYPES = ['product', 'character', 'environment', 'brand'];
const DEFAULT_COMPANY = 'Creative Identity';

/** Ensure the 4 default Creative Identity groups exist */
export async function seedDefaultGroups() {
  for (const type of TYPES) {
    const name = `${DEFAULT_COMPANY} ${type}`;
    const exists = await AssetGroup.findOne({ companyName: DEFAULT_COMPANY, type, isSystem: true });
    if (!exists) {
      await AssetGroup.create({
        name,
        companyName: DEFAULT_COMPANY,
        type,
        assetIds: [],
        identityIds: [],
        visibility: 'private',
        isSystem: true,
      });
    }
  }
}

r.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.visibility === 'public' || req.query.visibility === 'private') {
    filter.visibility = req.query.visibility;
  }
  if (req.query.type && TYPES.includes(req.query.type)) filter.type = req.query.type;
  res.json(await AssetGroup.find(filter).populate('assetIds').sort('isSystem -updatedAt').limit(200));
}));

r.post('/', wrap(async (req, res) => {
  const { companyName, type, assetIds = [], identityIds = [], visibility } = req.body;
  if (!companyName || !String(companyName).trim()) {
    return res.status(400).json({ error: 'Company name is required' });
  }
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Type must be product, character, environment, or brand' });
  }
  const name = `${String(companyName).trim()} ${type}`;
  const vis = visibility === 'public' ? 'public' : 'private';
  const doc = await AssetGroup.create({
    name,
    companyName: String(companyName).trim(),
    type,
    assetIds,
    identityIds,
    visibility: vis,
    isSystem: false,
  });
  res.status(201).json(await AssetGroup.findById(doc._id).populate('assetIds'));
}));

r.patch('/:id', wrap(async (req, res) => {
  const doc = await AssetGroup.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Group not found' });
  if (doc.isSystem) return res.status(403).json({ error: 'Default Creative Identity groups cannot be renamed' });
  if (req.body.companyName !== undefined || req.body.type !== undefined) {
    if (req.body.companyName !== undefined) doc.companyName = String(req.body.companyName).trim();
    if (req.body.type !== undefined && TYPES.includes(req.body.type)) doc.type = req.body.type;
    doc.name = `${doc.companyName} ${doc.type}`;
  }
  if (Array.isArray(req.body.assetIds)) doc.assetIds = req.body.assetIds;
  if (Array.isArray(req.body.identityIds)) doc.identityIds = req.body.identityIds;
  if (req.body.visibility === 'public' || req.body.visibility === 'private') {
    doc.visibility = req.body.visibility;
  }
  await doc.save();
  res.json(await AssetGroup.findById(doc._id).populate('assetIds'));
}));

r.post('/:id/assets', wrap(async (req, res) => {
  const doc = await AssetGroup.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Group not found' });
  const id = req.body.assetId;
  if (!id) return res.status(400).json({ error: 'assetId required' });
  doc.assetIds.addToSet(id);
  await doc.save();
  res.json(await AssetGroup.findById(doc._id).populate('assetIds'));
}));

/**
 * Delete group.
 * Body: { makePublic: true|false }
 * - makePublic true → group assets → visibility public (Open Shelf), group removed
 * - makePublic false → group + assets go to Recycle Bin (24h). Files kept on disk for restore.
 * System default groups cannot be deleted.
 */
r.delete('/:id', wrap(async (req, res) => {
  const doc = await AssetGroup.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Group not found' });
  if (doc.isSystem) {
    return res.status(403).json({ error: 'Default Creative Identity groups cannot be deleted' });
  }

  const makePublic = req.body?.makePublic === true || req.query.makePublic === 'true';
  const assets = await Asset.find({ _id: { $in: doc.assetIds } });

  if (makePublic) {
    for (const a of assets) {
      a.visibility = 'public';
      await a.save();
    }
    await AssetGroup.findByIdAndDelete(doc._id);
    return res.json({
      ok: true,
      makePublic: true,
      assetsHandled: assets.length,
      message: 'Group removed. Assets are now on Open Shelf (public).',
    });
  }

  // → Recycle Bin path: snapshot group + assets, keep files, remove from active lists
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const groupSnap = doc.toObject();

  for (const a of assets) {
    await RecycleBin.create({
      kind: 'asset',
      originalId: a._id,
      snapshot: a.toObject(),
      reason: `group-delete:${doc.name}`,
      expiresAt,
    });
    // Remove from active Asset Bank / Open Shelf but keep file on disk for restore
    await Asset.findByIdAndDelete(a._id);
  }

  await RecycleBin.create({
    kind: 'group',
    originalId: doc._id,
    snapshot: groupSnap,
    reason: 'group-delete',
    expiresAt,
  });

  await AssetGroup.findByIdAndDelete(doc._id);

  res.json({
    ok: true,
    makePublic: false,
    assetsHandled: assets.length,
    message: 'Group and its assets moved to Recycle Bin for 24 hours. You can restore from Recycle Bin.',
  });
}));

export default r;
export { TYPES, DEFAULT_COMPANY };
