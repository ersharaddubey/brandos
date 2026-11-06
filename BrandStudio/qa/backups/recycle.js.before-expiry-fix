import { Router } from 'express';
import RecycleBin from '../models/RecycleBin.js';
import Asset from '../models/Asset.js';
import AssetGroup from '../models/AssetGroup.js';
import Identity from '../models/Identity.js';
import { wrap } from '../middleware/common.js';
import { removeAssetFile } from '../services/assets.js';

const r = Router();

r.get('/', wrap(async (req, res) => {
  const now = new Date();
  res.json(await RecycleBin.find({ expiresAt: { $gt: now } }).sort('-createdAt').limit(200));
}));

/** Permanent delete one recycle entry (also deletes file if asset) */
r.delete('/:id', wrap(async (req, res) => {
  const item = await RecycleBin.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.kind === 'asset' && item.snapshot?.filename) {
    await removeAssetFile(item.snapshot).catch(() => {});
  }
  res.json({ ok: true });
}));

/** Empty entire bin (permanent) */
r.delete('/', wrap(async (req, res) => {
  const items = await RecycleBin.find();
  for (const item of items) {
    if (item.kind === 'asset' && item.snapshot?.filename) {
      await removeAssetFile(item.snapshot).catch(() => {});
    }
  }
  await RecycleBin.deleteMany({});
  res.json({ ok: true, removed: items.length });
}));

/**
 * Restore from Recycle Bin (rollback).
 * - asset    → re-create private Asset (file kept on disk at delete time)
 * - group    → re-create group (assets still in bin can be restored separately)
 * - identity → re-create identity
 */
r.post('/:id/restore', wrap(async (req, res) => {
  const item = await RecycleBin.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const snap = item.snapshot || {};

  if (item.kind === 'asset') {
    let restored;
    const existing = snap._id ? await Asset.findById(snap._id) : null;
    if (existing) {
      existing.visibility = 'private';
      await existing.save();
      restored = existing;
    } else {
      const payload = { ...snap };
      delete payload.__v;
      try {
        restored = await Asset.create(payload);
      } catch (e) {
        // sha256 unique conflict or similar — strip _id and retry
        delete payload._id;
        restored = await Asset.create(payload);
      }
    }
    await RecycleBin.findByIdAndDelete(item._id);
    return res.json({ ok: true, restored: true, kind: 'asset', item: restored });
  }

  if (item.kind === 'group') {
    const payload = { ...snap };
    delete payload.__v;
    const keepIds = [];
    for (const aid of payload.assetIds || []) {
      if (await Asset.findById(aid)) keepIds.push(aid);
    }
    payload.assetIds = keepIds;
    payload.identityIds = payload.identityIds || [];
    let restored;
    if (snap._id && !(await AssetGroup.findById(snap._id))) {
      restored = await AssetGroup.create(payload);
    } else {
      delete payload._id;
      restored = await AssetGroup.create(payload);
    }
    await RecycleBin.findByIdAndDelete(item._id);
    return res.json({ ok: true, restored: true, kind: 'group', item: restored });
  }

  if (item.kind === 'identity') {
    const payload = { ...snap };
    delete payload.__v;
    let restored;
    if (snap._id && !(await Identity.findById(snap._id))) {
      restored = await Identity.create(payload);
    } else {
      delete payload._id;
      restored = await Identity.create(payload);
    }
    await RecycleBin.findByIdAndDelete(item._id);
    return res.json({ ok: true, restored: true, kind: 'identity', item: restored });
  }

  return res.status(400).json({ error: `Cannot restore kind: ${item.kind}` });
}));

export default r;
