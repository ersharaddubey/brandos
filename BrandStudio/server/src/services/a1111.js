import config from '../config.js';

const base = () => config.a1111.url.replace(/\/$/, '');

/** Lightweight connectivity check against AUTOMATIC1111's REST API. */
export async function getA1111Status() {
  const url = base();
  try {
    const res = await fetch(`${url}/sdapi/v1/samplers`, { signal: AbortSignal.timeout(5002) });
    if (!res.ok) return { reachable: false, url, error: `AUTOMATIC1111 returned HTTP ${res.status}` };
    const samplers = await res.json();
    return { reachable: true, url, samplerCount: Array.isArray(samplers) ? samplers.length : 0,
      samplerNames: Array.isArray(samplers) ? samplers.map((s) => s.name).filter(Boolean).slice(0, 30) : [] };
  } catch (error) {
    return { reachable: false, url, error: error.name === 'TimeoutError' ? 'Connection timed out' : error.message };
  }
}
async function post(path, body, timeoutMs = 900000) {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`AUTOMATIC1111 ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}
/** Uses the documented Stable Diffusion WebUI API. First reference is used for img2img when enabled. */
export async function generateWithA1111({ prompt, seed, width, height, referencesBase64 = [] }) {
  const common = { prompt, negative_prompt: config.a1111.negativePrompt || '', seed, width, height,
    steps: config.a1111.steps, cfg_scale: config.a1111.cfgScale, sampler_name: config.a1111.sampler,
    batch_size: 1, n_iter: 1, send_images: true, save_images: false };
  const hasRef = referencesBase64.length > 0 && config.a1111.useImg2Img;
  const data = hasRef
    ? await post('/sdapi/v1/img2img', { ...common, init_images: [referencesBase64[0].replace(/^data:image\/[^;]+;base64,/, '')], denoising_strength: config.a1111.denoisingStrength })
    : await post('/sdapi/v1/txt2img', common);
  const image = data.images?.[0];
  if (!image) throw new Error('AUTOMATIC1111 response did not contain images[0]');
  return Buffer.from(image.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
}


/** Inpaint an existing image using a black/white mask (white = edit region). */
export async function inpaintWithA1111({ imageBase64, maskBase64, prompt, negativePrompt = '', seed = -1, width, height, denoisingStrength = 0.55 }) {
  const strip = (s) => String(s || '').replace(/^data:image\/[^;]+;base64,/, '');
  const data = await post('/sdapi/v1/img2img', {
    prompt, negative_prompt: negativePrompt || config.a1111.negativePrompt || '',
    init_images: [strip(imageBase64)], mask: strip(maskBase64),
    seed, width, height, steps: config.a1111.steps, cfg_scale: config.a1111.cfgScale,
    sampler_name: config.a1111.sampler, batch_size: 1, n_iter: 1,
    denoising_strength: Math.max(0.05, Math.min(1, Number(denoisingStrength) || 0.55)),
    inpainting_fill: 1, inpaint_full_res: true, inpaint_full_res_padding: 32, mask_blur: 4,
    send_images: true, save_images: false,
  });
  const image = data.images?.[0];
  if (!image) throw new Error('AUTOMATIC1111 inpaint response did not contain images[0]');
  return Buffer.from(strip(image), 'base64');
}
