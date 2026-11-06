import sharp from 'sharp';
import config from '../config.js';
import { segmentAssetWithGroundedSam2 } from './groundedSam2.js';
import { ingestImage } from './assets.js';
import { readAssetBuffer } from './assets.js';
import Asset from '../models/Asset.js';
import Identity from '../models/Identity.js';
import { analyzeIdentity } from './identityAnalyzer.js';
import { runInBackground } from './background.js';

/**
 * Text prompts for Grounded-SAM-2 per identity type.
 * Multiple phrases improve hit rate on lifestyle / fashion plates.
 */
const TYPE_PROMPTS = {
  character: 'person . people . man . woman . model . human',
  product: 'shoe . boot . sneakers . bag . product . clothing item . garment . accessory . watch . bottle',
  environment: 'background . landscape . desert . sky . mountains . ground . scenery . room . interior',
  brand: 'logo . brand logo . text logo . wordmark . brand mark . label',
};

const TYPES = ['character', 'product', 'environment', 'brand'];

function decodeMaskBuffer(maskField) {
  if (!maskField) return null;
  if (Buffer.isBuffer(maskField)) return maskField;
  if (typeof maskField === 'string') {
    const b64 = maskField.replace(/^data:image\/[^;]+;base64,/, '');
    return Buffer.from(b64, 'base64');
  }
  if (maskField.data && Array.isArray(maskField.data)) {
    return Buffer.from(maskField.data);
  }
  return null;
}

/**
 * Apply a white=keep mask onto the source image → transparent PNG cropped to content.
 */
async function cutoutWithMask(sourceBuffer, maskBuffer, bbox) {
  const src = sharp(sourceBuffer).ensureAlpha();
  const meta = await src.metadata();
  const w = meta.width;
  const h = meta.height;

  let mask = sharp(maskBuffer).resize(w, h, { fit: 'fill' }).greyscale();

  // Build RGBA: keep source RGB where mask is bright, alpha from mask
  const [srcRaw, maskRaw] = await Promise.all([
    src.raw().toBuffer({ resolveWithObject: true }),
    mask.raw().toBuffer({ resolveWithObject: true }),
  ]);

  const out = Buffer.alloc(w * h * 4);
  const s = srcRaw.data;
  const m = maskRaw.data;
  const channels = srcRaw.info.channels;

  for (let i = 0; i < w * h; i++) {
    const si = i * channels;
    const oi = i * 4;
    const alpha = m[i]; // 0..255
    out[oi] = s[si];
    out[oi + 1] = s[si + 1];
    out[oi + 2] = s[si + 2];
    out[oi + 3] = alpha;
  }

  let img = sharp(out, { raw: { width: w, height: h, channels: 4 } });

  // Optional tight crop from bbox [x, y, width, height] or [x1,y1,x2,y2]
  if (Array.isArray(bbox) && bbox.length >= 4) {
    let left, top, width, height;
    if (bbox[2] > 1 && bbox[2] <= w && bbox[3] > 1 && bbox[3] <= h && bbox[0] + bbox[2] <= w + 2) {
      // x,y,w,h
      left = Math.max(0, Math.floor(bbox[0]));
      top = Math.max(0, Math.floor(bbox[1]));
      width = Math.min(w - left, Math.ceil(bbox[2]));
      height = Math.min(h - top, Math.ceil(bbox[3]));
    } else {
      // x1,y1,x2,y2
      left = Math.max(0, Math.floor(Math.min(bbox[0], bbox[2])));
      top = Math.max(0, Math.floor(Math.min(bbox[1], bbox[3])));
      const right = Math.min(w, Math.ceil(Math.max(bbox[0], bbox[2])));
      const bottom = Math.min(h, Math.ceil(Math.max(bbox[1], bbox[3])));
      width = Math.max(1, right - left);
      height = Math.max(1, bottom - top);
    }
    // pad a little
    const pad = 8;
    left = Math.max(0, left - pad);
    top = Math.max(0, top - pad);
    width = Math.min(w - left, width + pad * 2);
    height = Math.min(h - top, height + pad * 2);
    if (width > 4 && height > 4) {
      img = img.extract({ left, top, width, height });
    }
  }

  return img.png().toBuffer();
}

/**
 * Merge multiple masks (OR) into one mask buffer for a type that has several instances
 * (e.g. 4 people → one combined character plate, or we take the best single mask).
 * Strategy: use the highest-score mask for a clean single subject cutout.
 */
function pickBestMask(masks) {
  if (!masks?.length) return null;
  const scored = masks
    .map((m) => ({
      ...m,
      score: Number(m.score ?? m.confidence ?? 0.5),
      maskBuf: decodeMaskBuffer(m.mask || m.segmentation || m.mask_base64 || m.png),
      bbox: m.bbox || m.box || m.bounding_box || null,
    }))
    .filter((m) => m.maskBuf);
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/**
 * Extract up to 4 identity-layer images from one source asset.
 * Returns { results: [{ type, asset, identity?, method, note }], warnings }
 */
export async function extractIdentityLayersFromAsset({
  assetId,
  types = TYPES,
  createIdentities = true,
  visibility = 'private',
  namePrefix = '',
  names = {},
}) {
  const asset = await Asset.findById(assetId);
  if (!asset) {
    const err = new Error('Asset not found');
    err.status = 404;
    throw err;
  }

  const sourceBuffer = await readAssetBuffer(asset);
  const wanted = (types || TYPES).filter((t) => TYPES.includes(t));
  const results = [];
  const warnings = [];

  const samEnabled = config.groundedSam2?.enabled === true;
  // names can be { product: 'Foo', character: 'Bar' } — custom label per type
  const nameMap = names && typeof names === 'object' ? names : {};

  for (const type of wanted) {
    let buffer = null;
    let method = 'full-image-fallback';
    let note = '';

    if (samEnabled) {
      try {
        const seg = await segmentAssetWithGroundedSam2({
          asset,
          prompt: TYPE_PROMPTS[type],
          boxThreshold: 0.25,
          textThreshold: 0.25,
        });
        const best = pickBestMask(seg.masks);
        if (best) {
          buffer = await cutoutWithMask(sourceBuffer, best.maskBuf, best.bbox);
          method = 'grounded-sam-2';
          note = `Cutout via Grounded SAM 2 (score ${best.score?.toFixed?.(2) ?? best.score})`;
        } else {
          note = 'SAM2 returned no mask for this type — saved full frame as fallback';
          buffer = await sharp(sourceBuffer).png().toBuffer();
          method = 'full-image-fallback';
        }
      } catch (e) {
        warnings.push(`${type}: SAM2 failed (${e.message}) — full image fallback`);
        buffer = await sharp(sourceBuffer).png().toBuffer();
        method = 'full-image-fallback';
        note = `SAM2 error: ${e.message}`;
      }
    } else {
      // No SAM2: still produce separate categorized assets from the same plate
      // so the user can lock / edit each type without re-uploading 4 times.
      buffer = await sharp(sourceBuffer).png().toBuffer();
      method = 'full-image-fallback';
      note =
        'Grounded SAM 2 disabled — full image saved under this type. Enable GROUNDED_SAM2 for real cutouts.';
      warnings.push(`${type}: SAM2 disabled`);
    }

    const custom = (nameMap[type] || '').trim();
    const label = custom
      ? custom
      : namePrefix
        ? `${namePrefix} ${type}`
        : type.charAt(0).toUpperCase() + type.slice(1);

    const { asset: outAsset } = await ingestImage({
      buffer,
      kind: 'reference',
      visibility,
      category: type,
      tags: ['extracted', type, method],
      prompt: `Extracted ${type} layer from ${asset._id}`,
      // Same full-frame fallback must not collapse into one asset (category overwrite)
      forceNew: true,
    });

    let identity = null;
    if (createIdentities) {
      identity = await Identity.create({
        name: label.slice(0, 80),
        type,
        description: note || `Auto-extracted ${type} from composite reference`,
        referenceAssetIds: [outAsset._id],
        status: 'analyzing',
      });
      await Asset.updateOne({ _id: outAsset._id }, { $addToSet: { identityIds: identity._id } });
      runInBackground(analyzeIdentity(identity._id));
    }

    results.push({
      type,
      method,
      note,
      asset: outAsset,
      identity,
    });
  }

  return {
    sourceAssetId: String(asset._id),
    samEnabled,
    results,
    warnings,
  };
}

/**
 * Upload buffer first, then extract — convenience for one-shot form.
 */
export async function extractIdentityLayersFromBuffer({
  buffer,
  types,
  createIdentities = true,
  visibility = 'private',
  namePrefix = '',
  names = {},
}) {
  const { asset } = await ingestImage({
    buffer,
    kind: 'upload',
    visibility,
    category: '',
    tags: ['extract-source'],
    prompt: 'Source plate for identity layer extraction',
  });
  return extractIdentityLayersFromAsset({
    assetId: asset._id,
    types,
    createIdentities,
    visibility,
    namePrefix,
    names,
  });
}
