import sharp from 'sharp';
import config from '../config.js';
import { generateWithComfyUI } from './comfyui.js';
import { generateWithInstantID } from './instantid.js';
import { generateWithA1111 } from './a1111.js';
import { generateWithInvokeAI } from './invokeai.js';
import { generateImageBuffer as generateWithApiProviders } from './imageService.js';

const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

function wrap(text, n = 46, maxLines = 12) {
  const words = text.replace(/\s+/g, ' ').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).length > n) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/** Parse aspect ratio string ("16:9", "1:1", "3/4", "4x5") → { width, height } keeping area ≈ baseW*baseH, sides multiple of 16. */
export function resolveSize({ width, height, aspectRatio } = {}) {
  const baseW = Number(width) || config.generator.width || 1024;
  const baseH = Number(height) || config.generator.height || 1024;
  if (!aspectRatio || !String(aspectRatio).trim()) {
    return { width: snap16(baseW), height: snap16(baseH) };
  }
  const m = String(aspectRatio).trim().match(/^(\d+(?:\.\d+)?)\s*[:/xX]\s*(\d+(?:\.\d+)?)$/);
  if (!m) return { width: snap16(baseW), height: snap16(baseH) };
  const aw = parseFloat(m[1]);
  const ah = parseFloat(m[2]);
  if (!(aw > 0 && ah > 0)) return { width: snap16(baseW), height: snap16(baseH) };
  const area = baseW * baseH;
  const scale = Math.sqrt(area / (aw * ah));
  return { width: snap16(aw * scale), height: snap16(ah * scale) };
}

function snap16(n) {
  return Math.max(256, Math.round(n / 16) * 16);
}

async function mock({ prompt, seed, width, height }) {
  const hue = seed % 360;
  const lines = wrap(prompt)
    .map((l, i) => `<text x="40" y="${120 + i * 34}" font-size="22" fill="#fff" font-family="monospace">${esc(l)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="hsl(${hue},45%,28%)"/>
    <text x="40" y="70" font-size="34" fill="#ffd166" font-family="sans-serif" font-weight="bold">MOCK GENERATION  seed ${seed}</text>
    ${lines}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function http({ prompt, seed, width, height, referencesBase64 = [] }) {
  const res = await fetch(config.generator.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      seed,
      width,
      height,
      reference_image: referencesBase64[0] || null,
      reference_images: referencesBase64.length ? referencesBase64 : [],
    }),
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Generator ${res.status}: ${body}`);
  }
  const type = res.headers.get('content-type') || '';
  if (type.startsWith('image/')) return Buffer.from(await res.arrayBuffer());
  const data = await res.json();
  if (data.image_base64) return Buffer.from(data.image_base64, 'base64');
  if (data.image_url) return Buffer.from(await (await fetch(data.image_url)).arrayBuffer());
  throw new Error('Generator response had no image');
}

/**
 * Free, no API key — Pollinations.ai (Flux Schnell style public endpoint).
 * Note: reference images are NOT sent; prompt-only generation.
 */
async function pollinations({ prompt, seed, width, height }) {
  const w = Math.min(1280, Math.max(256, width || 1024));
  const h = Math.min(1280, Math.max(256, height || 1024));
  const q = encodeURIComponent(String(prompt || 'beautiful image').slice(0, 1500));
  const url =
    `https://image.pollinations.ai/prompt/${q}` +
    `?width=${w}&height=${h}&seed=${seed || 0}&nologo=true&model=flux`;
  const res = await fetch(url, {
    headers: { Accept: 'image/*' },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`Pollinations ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generate an image from prompt.
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string[]} [opts.referencesBase64]
 * @param {string} [opts.referenceBase64]
 * @param {number} [opts.width]
 * @param {number} [opts.height]
 * @param {string} [opts.aspectRatio] e.g. "16:9", "1:1", "3:4"
 */
export async function generateImage({ prompt, referencesBase64 = [], referenceBase64, width, height, aspectRatio } = {}) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const refs = referencesBase64.length ? referencesBase64 : referenceBase64 ? [referenceBase64] : [];
  const size = resolveSize({ width, height, aspectRatio });
  const args = { prompt, seed, width: size.width, height: size.height, referencesBase64: refs };
  let buffer;
  if (config.generator.provider === 'http') buffer = await http(args);
  else if (config.generator.provider === 'pollinations') buffer = await pollinations(args);
  else if (config.generator.provider === 'comfyui') {
    if (config.comfyui.identityMode === 'instantid') buffer = await generateWithInstantID(args);
    else buffer = await generateWithComfyUI(args);
  }
  else if (config.generator.provider === 'a1111') buffer = await generateWithA1111(args);
  else if (config.generator.provider === 'invokeai') buffer = await generateWithInvokeAI(args);
  else if (config.generator.provider === 'api') {
    // Cloud APIs (fal / replicate / stability / ideogram / openai / together) — IMAGE_PROVIDER_ORDER se fallback.
    // Note: reference images API providers ko nahi bheji jaati; identity details prompt text me hoti hain.
    ({ buffer } = await generateWithApiProviders(prompt, { width: size.width, height: size.height, aspectRatio }));
  }
  else if (config.generator.provider === 'mock') buffer = await mock(args);
  else throw new Error(`Unsupported GENERATOR_PROVIDER: ${config.generator.provider}`);
  return { buffer, seed, width: size.width, height: size.height };
}
