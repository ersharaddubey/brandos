import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';
import config from '../config.js';
import { uploadBuffer } from './storage.js';

const falKey = () => (process.env.FAL_KEYS || process.env.FAL_KEY || '').split(',')[0].trim();

/** Prompt -> video (fal.ai). Returns { url, provider, model, seconds }. Text-to-video. */
export async function generateVideo({ prompt, aspectRatio, duration } = {}) {
  if (!prompt || !String(prompt).trim()) throw new Error('Prompt required');
  const key = falKey();
  if (!key) throw new Error('Video generation ke liye server/.env me FAL_KEY chahiye (fal.ai). Bina key ke sirf video prompt ban sakta hai.');
  fal.config({ credentials: key });
  const model = config.video.falModel;
  const input = { prompt: String(prompt).slice(0, 2000) };
  if (['16:9', '9:16', '1:1'].includes(String(aspectRatio))) input.aspect_ratio = String(aspectRatio);
  if (duration) input.duration = String(duration);
  const t0 = Date.now();
  const result = await Promise.race([
    fal.subscribe(model, { input, logs: false }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Video generation timeout')), config.video.timeoutMs)),
  ]);
  const remote = result?.data?.video?.url || result?.video?.url || result?.data?.videos?.[0]?.url;
  if (!remote) throw new Error(`fal model "${model}" ne video URL nahi diya. VIDEO_FAL_MODEL check karo.`);
  const res = await fetch(remote);
  if (!res.ok) throw new Error(`Video download failed (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const name = `video-${Date.now()}.mp4`;
  // Local cache (server/uploads/videos) + Cloudinary (agar configured ho)
  const dir = path.join(config.uploadDir, 'videos');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  const remoteCopy = await uploadBuffer(buffer, name, 'brandstudio/videos');
  return { url: remoteCopy?.url || `/uploads/videos/${name}`, provider: 'fal', model, seconds: Math.round((Date.now() - t0) / 1000) };
}
