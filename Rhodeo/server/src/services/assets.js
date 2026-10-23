import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import config from '../config.js';
import Asset from '../models/Asset.js';
import { sha256, dhash, hamming } from './hash.js';
import { embedText } from './embedding.js';
import Identity from '../models/Identity.js';
import { buildAssetSearchText } from './searchText.js';
import { upsertAssetVector } from './qdrant.js';

const VALID_CAT = new Set(['product', 'character', 'environment', 'brand']);

/** Store an image. Exact duplicates (same sha256) are not stored twice. */
export async function ingestImage({
  buffer,
  kind = 'upload',
  identityIds = [],
  campaignId,
  generationId,
  prompt,
  score,
  tags = [],
  visibility = 'private',
  category = '',
}) {
  const sha = sha256(buffer);
  const existing = await Asset.findOne({ sha256: sha });
  if (existing) return { asset: existing, duplicate: true };

  const meta = await sharp(buffer).metadata();
  const ext = meta.format === 'jpeg' ? 'jpg' : meta.format || 'png';
  const filename = `${sha.slice(0, 24)}.${ext}`;
  await fs.promises.writeFile(path.join(config.uploadDir, filename), buffer);

  const hash = await dhash(buffer);
  let similarTo = null;
  const others = await Asset.find({ dhash: { $exists: true } }).select('dhash').lean();
  for (const o of others) {
    if (hamming(o.dhash, hash) <= config.similarThreshold) {
      similarTo = o._id;
      break;
    }
  }

  const vis = visibility === 'public' ? 'public' : 'private';
  const cat = VALID_CAT.has(category) ? category : '';
  const linkedIdentities = identityIds.length
    ? await Identity.find({ _id: { $in: identityIds } })
        .select('name type description anchors')
        .lean()
    : [];
  const searchText = buildAssetSearchText({
    filename, kind, category: cat, prompt, tags
  }, linkedIdentities);
  const embedding = await embedText(searchText);
  const asset = await Asset.create({
    kind,
    category: cat,
    filename,
    sha256: sha,
    dhash: hash,
    size: buffer.length,
    width: meta.width,
    height: meta.height,
    identityIds,
    campaignId,
    generationId,
    prompt,
    searchText,
    ...(embedding ? { embedding } : {}),
    score,
    tags,
    similarTo,
    visibility: vis,
  });
  if (embedding) {
    try {
      await upsertAssetVector(asset, embedding);
    } catch (error) {
      console.warn('Qdrant upload sync failed:', error.message);
    }
  }
  return { asset, duplicate: false, similarTo };
}

export async function readAssetBuffer(asset) {
  return fs.promises.readFile(path.join(config.uploadDir, asset.filename));
}

export async function assetBase64(asset, max = 1024) {
  const buf = await readAssetBuffer(asset);
  const small = await sharp(buf).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return small.toString('base64');
}

export async function removeAssetFile(asset) {
  await fs.promises.unlink(path.join(config.uploadDir, asset.filename)).catch(() => {});
}
