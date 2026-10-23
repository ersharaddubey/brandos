import { Router } from 'express';
import sharp from 'sharp';
import Identity from '../models/Identity.js';
import { wrap, upload } from '../middleware/common.js';
import { compilePrompt } from '../services/promptCompiler.js';
import { checkConsistency } from '../services/consistency.js';
import { ingestImage } from '../services/assets.js';
import { imageToPrompt } from '../services/ollama.js';
import { generateImage } from '../services/generator.js';
import config from '../config.js';

const r = Router();

const loadIdentities = async (ids) => {
  const list = (Array.isArray(ids) ? ids : String(ids || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) return [];
  return Identity.find({ _id: { $in: list } });
};

// Identity (+ optional scene) -> copy-paste prompt. Ollama use nahi hota, isliye instant. Draft identity par bhi chalta hai (preview).
r.post('/', wrap(async (req, res) => {
  const { identityIds, goal, scene, composition, style, aspectRatio, avoid } = req.body;
  const identities = await loadIdentities(identityIds);
  if (!identities.length) return res.status(400).json({ error: 'Select at least one identity' });
  res.json(compilePrompt({ identities, goal, scene, composition, style, aspectRatio, avoid }));
}));

// Site se bani image wapas upload karo -> anchors ke against check -> sudhra hua prompt (v2)
r.post('/check', upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Generated image required' });
  const { identityIds, goal, scene, composition, style, aspectRatio, avoid, prompt } = req.body;
  const identities = await loadIdentities(identityIds);
  if (!identities.length) return res.status(400).json({ error: 'Select at least one identity' });

  const result = await checkConsistency({ identities, imageBuffer: req.file.buffer, lockScene: !String(scene || '').trim() });
  if (result.score == null) return res.status(422).json({ error: 'Check nahi ho paya - identity ki reference image / Ollama vision check karo' });

  const { asset } = await ingestImage({
    buffer: req.file.buffer, kind: 'generated', identityIds: identities.map((i) => i._id),
    prompt: prompt || undefined, score: result.score, tags: ['checked-upload'],
  });

  // fail hue aspects pehle: suggestions (prompt changes) > mismatches
  const strip = (m) => String(m).replace(/^\[[^\]]*\]\s*/, '').replace(/^\w+ \d+\/100:\s*/, '');
  const fixes = [...new Set((result.suggestions.length ? result.suggestions : result.mismatches.map(strip)).map((x) => String(x).trim()).filter(Boolean))].slice(0, 6);
  const improved = compilePrompt({ identities, goal, scene, composition, style, aspectRatio, avoid, corrections: fixes });
  res.json({ ...result, fixes, asset, improved });
}));

// Prompt Gallery feature: Image -> detailed structured prompt (vision model)
r.post('/image-to-prompt', upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image required' });
  const maxPx = config.ollama.analyzeMaxPx || 768;
  const small = await sharp(req.file.buffer)
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const prompt = await imageToPrompt(small.toString('base64'));
  res.json({ prompt });
}));

// Freeform image generation from a prompt (no identity lock required) — Prompt Gallery "Image Create"
r.post('/generate-image', wrap(async (req, res) => {
  const { prompt, negativePrompt, width, height, aspectRatio } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required' });
  const fullPrompt = negativePrompt?.trim()
    ? `${prompt.trim()}\n\nNegative: ${negativePrompt.trim()}`
    : prompt.trim();
  const { buffer, seed, width: w, height: h } = await generateImage({
    prompt: fullPrompt,
    width,
    height,
    aspectRatio,
  });
  const { asset } = await ingestImage({
    buffer,
    kind: 'generated',
    prompt: fullPrompt,
    tags: ['freeform', 'image-create'],
  });
  res.json({
    asset,
    seed,
    width: w,
    height: h,
    url: `/uploads/${asset.filename}`,
  });
}));

export default r;
