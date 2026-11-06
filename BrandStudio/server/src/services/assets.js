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
import { uploadBuffer, downloadBuffer, deleteRemote } from './storage.js';

const VALID_CAT = new Set(['product', 'character', 'environment', 'brand']);

/** Store an image. Exact duplicates (same sha256) are not stored twice.
 *  If DB has the asset but the file is gone (docker volume reset, manual delete),
 *  rewrite the bytes so references work again instead of throwing "file missing". */
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
  /** When true, always create a new Asset row even if bytes match an existing one.
   *  Needed for extract-all: same plate is stored once per type (product/character/…). */
  forceNew = false,
}) {
  const contentSha = sha256(buffer);
  // forceNew: same pixels can be stored once per type (extract-all). Salt sha so unique index is happy.
  const sha = forceNew
    ? sha256(Buffer.concat([buffer, Buffer.from(`|${category || 'none'}|${Date.now()}|${Math.random()}`)]))
    : contentSha;
  const existing = forceNew ? null : await Asset.findOne({ sha256: contentSha });
  if (existing) {
    const filePath = path.join(config.uploadDir, existing.filename);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      await fs.promises.mkdir(config.uploadDir, { recursive: true });
      await fs.promises.writeFile(filePath, buffer);
    }
    // Older assets saved before Cloudinary: push them up now so they survive redeploys
    if (!existing.imageUrl) {
      const up = await uploadBuffer(buffer, existing.filename);
      if (up) {
        existing.imageUrl = up.url;
        existing.imageFileId = up.fileId;
        await existing.save();
      }
    }
    // Keep category / identity links fresh when re-using
    if (category && VALID_CAT.has(category) && existing.category !== category) {
      existing.category = category;
      await existing.save();
    }
    if (identityIds?.length) {
      await Asset.updateOne(
        { _id: existing._id },
        { $addToSet: { identityIds: { $each: identityIds } } }
      );
    }
    return { asset: existing, duplicate: true };
  }

  const meta = await sharp(buffer).metadata();
  const ext = meta.format === 'jpeg' ? 'jpg' : meta.format || 'png';
  // Unique filename even when content matches (forceNew extract layers)
  const filename = forceNew
    ? `${contentSha.slice(0, 16)}-${(category || 'x').slice(0, 8)}-${sha.slice(0, 8)}.${ext}`
    : `${contentSha.slice(0, 24)}.${ext}`;
  await fs.promises.mkdir(config.uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(config.uploadDir, filename), buffer);
  const remote = await uploadBuffer(buffer, filename);

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
    imageUrl: remote?.url,
    imageFileId: remote?.fileId,
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
  const filePath = path.join(config.uploadDir, asset.filename);
  try {
    return await fs.promises.readFile(filePath);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      // Local cache was wiped (redeploy) — restore it from Cloudinary
      const remote = await downloadBuffer(asset.imageUrl);
      if (remote) {
        await fs.promises.mkdir(config.uploadDir, { recursive: true });
        await fs.promises.writeFile(filePath, remote).catch(() => {});
        return remote;
      }
      const err = new Error(
        `Reference image file missing on disk: ${asset.filename}. ` +
          `Re-upload the reference for this identity (Identity Detail → Add another reference) or delete the broken asset.`
      );
      err.code = 'ENOENT';
      err.assetId = asset._id;
      err.filename = asset.filename;
      throw err;
    }
    throw e;
  }
}

export async function assetBase64(asset, max = 1024) {
  const buf = await readAssetBuffer(asset);
  const small = await sharp(buf).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return small.toString('base64');
}

export async function removeAssetFile(asset) {
  await fs.promises.unlink(path.join(config.uploadDir, asset.filename)).catch(() => {});
  await deleteRemote(asset.imageFileId);
}
