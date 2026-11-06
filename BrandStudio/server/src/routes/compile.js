import { Router } from 'express';
import sharp from 'sharp';
import Identity from '../models/Identity.js';
import { wrap, upload } from '../middleware/common.js';
import { compilePrompt } from '../services/promptCompiler.js';
import { checkConsistency } from '../services/consistency.js';
import { ingestImage } from '../services/assets.js';
import { imageToPrompt } from '../services/ollama.js';
import { generateImage } from '../services/generator.js';
import { generateVideo } from '../services/video.js';
import config from '../config.js';
import { probeDriveVideo, resolveDriveLink } from '../services/gdrive.js';
import { identityProfile } from '../services/lockSchema.js';

const r = Router();

const loadIdentities = async (ids) => {
  const list = (Array.isArray(ids) ? ids : String(ids || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) return [];
  return Identity.find({ _id: { $in: list } });
};

// Identity (+ optional scene) -> copy-paste prompt. Ollama use nahi hota, isliye instant. Draft identity par bhi chalta hai (preview).
r.post('/', wrap(async (req, res) => {
  const { identityIds, goal, scene, composition, style, aspectRatio, avoid, focus } = req.body;
  const identities = await loadIdentities(identityIds);
  if (!identities.length) return res.status(400).json({ error: 'Select at least one identity' });
  res.json(compilePrompt({ identities, goal, scene, composition, style, aspectRatio, avoid, focus }));
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
    url: asset.url,
  });
}));

function buildVideoPrompt({ identities, goal, scene, composition, style, avoid, focus, duration, motion, aspectRatio, videoUrl, videoName, videoTsStart, videoTsEnd, extractWhat, segments, drive }) {
  const order = { character: 0, product: 1, brand: 2, environment: 3 };
  const ids = [...(identities || [])].sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  const lockLines = ids.map((i) => {
    const p = identityProfile(i, { includeScene: i.type === 'environment' });
    const bits = Object.entries(p).slice(0, 12).map(([k, v]) => `${k}: ${v}`).join('; ');
    const anchors = (i.anchors || []).length ? ` ANCHORS: ${(i.anchors || []).slice(0, 6).join('; ')}` : '';
    return `${i.type.toUpperCase()} "${i.name}"${bits ? ` — ${bits}` : ''}${anchors}`;
  });

  const TYPE_FOCUS = {
    character: 'face, hair, outfit, body performance, gesture',
    product: 'silhouette, material, logo, design details',
    brand: 'logo, brand colors, typography, visual style, campaign voice',
    environment: 'place, architecture, lighting, camera move, atmosphere',
  };

  let segs = Array.isArray(segments) ? segments.filter((s) => s && (s.start || s.end || (s.extract && s.extract.length))) : [];
  if (!segs.length && (videoTsStart || videoTsEnd || extractWhat)) {
    segs = [{
      start: videoTsStart || '0:00',
      end: videoTsEnd || 'end',
      extract: String(extractWhat || 'character,product,brand,environment')
        .split(/[,|]/).map((x) => x.trim().toLowerCase()).filter(Boolean),
    }];
  }

  const segmentBlocks = segs.map((s, i) => {
    const range = `${s.start || '0:00'} → ${s.end || 'end'}`;
    const extract = (Array.isArray(s.extract) ? s.extract : String(s.extract || '').split(','))
      .map((x) => String(x).trim().toLowerCase())
      .filter((x) => ['character', 'product', 'brand', 'environment'].includes(x));
    const focusLines = (extract.length ? extract : ['character', 'product', 'brand', 'environment'])
      .map((t) => `  – ${t.toUpperCase()}: ${TYPE_FOCUS[t] || t}`)
      .join('\n');
    return `SEGMENT ${i + 1} [${range}]\nGenerate / extract from this time range:\n${focusLines}`;
  });

  const refUrl = drive?.viewUrl || videoUrl || '';
  const lines = [
    'VIDEO GENERATION PROMPT',
    'Mode: motion sequence (not a still image). Preserve identity locks across every frame.',
    goal && `GOAL: ${goal}`,
    scene && `SCENE: ${scene}`,
    composition && `COMPOSITION: ${composition}`,
    style && `LOOK / GRADE: ${style}`,
    motion && `CAMERA / MOTION LANGUAGE: ${motion}`,
    duration && `DURATION: ${duration}s`,
    aspectRatio && `ASPECT: ${aspectRatio}`,
    focus && `FOCUS ONLY: ${focus}`,
    avoid && `AVOID: ${avoid}`,
    lockLines.length && ('LOCKED IDENTITIES:\n' + lockLines.map((l) => '• ' + l).join('\n')),
    refUrl && `REFERENCE VIDEO URL: ${refUrl}`,
    drive?.directUrl && `REFERENCE VIDEO DOWNLOAD: ${drive.directUrl}`,
    videoName && `REFERENCE VIDEO NAME: ${videoName}`,
    drive?.reachable === true && 'DRIVE ACCESS: reachable (shared link)',
    drive?.reachable === false && 'DRIVE ACCESS: link may need “Anyone with the link”',
    segmentBlocks.length && ('TIME SEGMENTS (what to generate per range):\n\n' + segmentBlocks.join('\n\n')),
    'RULES: same faces, products, logos, brand colors; smooth motion; no face morph; no logo drift; honour each segment’s generate targets.',
  ].filter(Boolean);

  return {
    paragraph: lines.join('\n\n'),
    locks: ids.map((i) => ({ id: i._id, name: i.name, type: i.type })),
    reference: {
      url: refUrl,
      directUrl: drive?.directUrl || null,
      name: videoName || null,
      timestamps: segmentBlocks.length ? segs.map((s) => `${s.start || '0:00'}→${s.end || 'end'}`).join(' | ') : null,
      segments: segs,
      extractWhat: extractWhat || null,
      driveReachable: drive?.reachable ?? null,
      driveNote: drive?.note || null,
    },
    settings: {
      duration: duration ? Number(duration) : null,
      motion: motion || null,
      aspectRatio: aspectRatio || null,
    },
  };
}

function parseGoogleDriveIdSafe(u) {
  try { return resolveDriveLink(u)?.id; } catch { return null; }
}

/** Video flow — Google Drive / https video URL + locks → copy-ready video prompt (not image generate) */
r.post('/video-prompt', wrap(async (req, res) => {
  const {
    identityIds, goal, scene, composition, style, avoid, focus,
    duration, motion, aspectRatio,
    videoUrl, videoName, videoTsStart, videoTsEnd, extractWhat, segments,
  } = req.body || {};
  const identities = await loadIdentities(identityIds);
  if (!identities.length) return res.status(400).json({ error: 'Select at least one locked identity' });

  let drive = null;
  const url = String(videoUrl || '').trim();
  if (url) {
    if (/drive\.google\.com|docs\.google\.com/i.test(url) || parseGoogleDriveIdSafe(url)) {
      drive = await probeDriveVideo(url);
    } else if (/^https?:\/\//i.test(url)) {
      drive = { viewUrl: url, directUrl: url, id: null, reachable: null, note: 'External video URL embedded in prompt.' };
    } else {
      return res.status(400).json({ error: 'videoUrl must be a Google Drive share link or https URL' });
    }
  }

  res.json(buildVideoPrompt({
    identities, goal, scene, composition, style, avoid, focus,
    duration, motion, aspectRatio,
    videoUrl: url, videoName, videoTsStart, videoTsEnd, extractWhat, segments, drive,
  }));
}));

// Real video file (text-to-video via fal). Studio -> Video -> "Generate video file"
r.post('/generate-video', wrap(async (req, res) => {
  const { prompt, aspectRatio, duration } = req.body || {};
  if (!String(prompt || '').trim()) return res.status(400).json({ error: 'Prompt required' });
  res.json(await generateVideo({ prompt, aspectRatio, duration }));
}));

export default r;
