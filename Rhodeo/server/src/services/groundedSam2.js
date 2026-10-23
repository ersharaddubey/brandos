import config from '../config.js';
import { readAssetBuffer } from './assets.js';

const baseUrl = () => config.groundedSam2.url.replace(/\/$/, '');

async function request(url, options = {}, timeoutMs = config.groundedSam2.timeoutMs) {
  const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 700);
    throw new Error(`Grounded SAM 2 service returned ${response.status}: ${detail || response.statusText}`);
  }
  return response;
}

/**
 * Adapter contract: a local Grounded-SAM-2 inference service exposes POST /segment
 * accepting multipart image + prompt + thresholds, and returns JSON masks.
 */
export async function segmentAssetWithGroundedSam2({ asset, prompt, boxThreshold, textThreshold }) {
  if (!config.groundedSam2.enabled) {
    const error = new Error('Grounded SAM 2 is disabled. Set GROUNDED_SAM2_ENABLED=true and configure GROUNDED_SAM2_URL.');
    error.status = 503;
    throw error;
  }
  if (!asset) { const error = new Error('Asset not found'); error.status = 404; throw error; }
  const image = await readAssetBuffer(asset);
  const form = new FormData();
  const mime = /\.jpe?g$/i.test(asset.filename) ? 'image/jpeg' : /\.webp$/i.test(asset.filename) ? 'image/webp' : 'image/png';
  form.append('image', new Blob([image], { type: mime }), asset.filename || 'asset-image');
  form.append('prompt', prompt);
  form.append('box_threshold', String(boxThreshold));
  form.append('text_threshold', String(textThreshold));
  const response = await request(`${baseUrl()}${config.groundedSam2.segmentPath}`, { method: 'POST', body: form });
  const result = await response.json();
  if (!result || !Array.isArray(result.masks)) throw new Error('Grounded SAM 2 response must be JSON with a masks array. See GROUNDED_SAM2_SETUP.md for the adapter contract.');
  return {
    provider: 'grounded-sam-2',
    assetId: String(asset._id),
    prompt,
    imageWidth: asset.width || null,
    imageHeight: asset.height || null,
    ...result,
  };
}

export async function getGroundedSam2Status() {
  if (!config.groundedSam2.enabled) {
    return { enabled: false, reachable: false, url: baseUrl(), segmentPath: config.groundedSam2.segmentPath, error: 'Disabled by GROUNDED_SAM2_ENABLED=false' };
  }
  try {
    const response = await request(`${baseUrl()}${config.groundedSam2.healthPath}`, {}, Math.min(config.groundedSam2.timeoutMs, 5001));
    const data = await response.json().catch(() => ({}));
    return { enabled: true, reachable: true, url: baseUrl(), segmentPath: config.groundedSam2.segmentPath, ...data };
  } catch (error) {
    return { enabled: true, reachable: false, url: baseUrl(), segmentPath: config.groundedSam2.segmentPath, error: error.message };
  }
}
