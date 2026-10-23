import config from '../config.js';

const base = () => config.invokeai.url.replace(/\/$/, '');
async function request(path, options = {}, timeoutMs = 900000) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(config.invokeai.apiKey ? { Authorization: `Bearer ${config.invokeai.apiKey}` } : {}), ...options.headers };
  const res = await fetch(`${base()}${path}`, { ...options, headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`InvokeAI ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const type = res.headers.get('content-type') || '';
  if (type.startsWith('image/')) return { rawImage: Buffer.from(await res.arrayBuffer()) };
  return res.json();
}
function decodeImage(data) {
  const b64 = data?.image_base64 || data?.base64 || data?.image;
  if (typeof b64 === 'string') return Buffer.from(b64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
  return null;
}
/** Configurable InvokeAI REST adapter. Endpoint/response paths vary across InvokeAI releases; configure them for your installed API version. */
export async function generateWithInvokeAI({ prompt, seed, width, height, referencesBase64 = [] }) {
  const payload = { prompt, seed, width, height, ...(referencesBase64[0] ? { reference_image_base64: referencesBase64[0] } : {}) };
  const result = await request(config.invokeai.generatePath, { method: 'POST', body: JSON.stringify(payload) }, config.invokeai.timeoutMs);
  if (result.rawImage) return result.rawImage;
  const immediate = decodeImage(result);
  if (immediate) return immediate;
  const imageUrl = result.image_url || result.url || result.output?.image_url;
  if (imageUrl) {
    const target = /^https?:\/\//i.test(imageUrl) ? imageUrl : `${base()}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    const res = await fetch(target, { headers: config.invokeai.apiKey ? { Authorization: `Bearer ${config.invokeai.apiKey}` } : {}, signal: AbortSignal.timeout(config.invokeai.timeoutMs) });
    if (!res.ok) throw new Error(`InvokeAI image download failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`InvokeAI endpoint returned no direct image. Configure INVOKEAI_GENERATE_PATH for your API version; response keys: ${Object.keys(result || {}).join(', ')}`);
}
