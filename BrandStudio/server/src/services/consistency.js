import config from '../config.js';
import { chat } from './ollama.js';
import { assetBase64 } from './assets.js';
import Asset from '../models/Asset.js';
import sharp from 'sharp';
import { identityProfile } from './lockSchema.js';

const toList = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// [key, weight, kya compare karna hai]
const ASPECTS = {
  character: [
    ['face', 3, 'face shape, eyes, eyebrows, nose, lips, jaw, skin tone - is it the SAME PERSON?'],
    ['hair', 2, 'hair length, volume, fringe / parting, color, texture'],
    ['beard', 2, 'beard / moustache density, length, shape'],
    ['glasses', 2, 'eyewear frame shape, color, thickness'],
    ['clothing', 1, 'garments, knit / fabric, color, fit'],
    ['accessories', 2, 'watch (case, bezel, dial, strap), jewelry'],
    ['props_logo', 2, 'held objects (e.g. mug): shape, color, finish and the logo / emblem / text printed on them'],
  ],
  product: [
    ['shape', 3, 'silhouette, proportions, design details'],
    ['material_finish', 2, 'material, texture, gloss / matte'],
    ['color', 2, 'exact colors'],
    ['logo_text', 3, 'logo shape, position and exact text'],
  ],
  environment: [
    ['place', 3, 'architecture, layout, fixed landmarks'],
    ['lighting', 2, 'light direction, quality, color temperature, mood'],
    ['objects', 2, 'furniture, plants, wall art, props'],
  ],
  brand: [
    ['visual', 3, 'visual language, composition style, mood'],
    ['colors', 2, 'brand colors'],
    ['typography_marks', 3, 'typography, logo, exact text'],
  ],
};
const BACKGROUND = ['background', 2, 'room / background layout, furniture, wall art, window, lighting direction and mood, color temperature'];

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** weighted average, lekin koi bhi important aspect (weight>=2) fail ho to score uske +15 se upar nahi jaa sakta */
export function combineScores(aspects) {
  const valid = aspects.filter((a) => a.score != null);
  if (!valid.length) return null;
  const w = valid.reduce((s, a) => s + a.weight, 0);
  const avg = valid.reduce((s, a) => s + a.weight * a.score, 0) / w;
  const important = valid.filter((a) => a.weight >= 2).map((a) => a.score);
  const worst = important.length ? Math.min(...important) : 100;
  return Math.round(Math.min(avg, worst + 15));
}

/** Expected logo / text words vs. kya generated image me sach me padha ja raha hai */
async function textScore(identity, genB64) {
  const p = identityProfile(identity);
  const expected = [p.textDetected, p.logo].filter((v) => v && !/^none$/i.test(String(v).trim())).join(' ');
  const words = [...new Set(norm(expected).split(' ').filter((w) => w.length >= 3))].slice(0, 12);
  if (!words.length) return null;
  try {
    const out = await chat({
      model: config.ollama.visionModel,
      json: true,
      images: [genB64],
      content: 'Transcribe EXACTLY every readable word or letter visible in this image (logos, mug, signs, posters, clothing). Do not guess or complete partial words. Return JSON: {"text": "all words you can read, or empty string"}',
    });
    const got = norm(out.text);
    const hit = words.filter((w) => got.includes(w)).length;
    return { score: clamp((hit / words.length) * 100), expected: words, read: got };
  } catch {
    return null;
  }
}

/** Optional: InsightFace embedding similarity (flux-server /face-similarity). Sirf character ke liye. */
async function faceScore(refB64, genB64) {
  if (!config.faceCheckUrl) return null;
  try {
    const res = await fetch(config.faceCheckUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: refB64, b: genB64 }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const { similarity } = await res.json();
    if (typeof similarity !== 'number') return null;
    // ArcFace cosine: ~0.15 = alag insaan, ~0.55+ = same insaan
    return { score: clamp(((similarity - 0.15) / 0.4) * 100), similarity };
  } catch {
    return null;
  }
}

/** Compare a generated image against each locked identity's reference image (strict, per-aspect). */
export async function checkConsistency({ identities, imageBuffer, lockScene = false }) {
  const genB64 = (await sharp(imageBuffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
  const checks = [];
  const mismatches = [];
  const suggestions = [];

  for (const identity of identities) {
    const refId = identity.referenceAssetIds?.[0];
    const ref = refId && (await Asset.findById(refId));
    if (!ref) continue;
    let refB64;
    try {
      refB64 = await assetBase64(ref);
    } catch (e) {
      if (e?.code === 'ENOENT') {
        console.warn('[consistency] skip missing ref file', ref.filename, identity.name);
        continue;
      }
      throw e;
    }
    const profile = Object.entries(identityProfile(identity, { includeScene: lockScene || identity.type === 'environment' })).map(([k, v]) => `${k}: ${v}`).join('; ');

    const defs = [...(ASPECTS[identity.type] || [])];
    if (lockScene && identity.type !== 'environment') defs.push(BACKGROUND);

    const prompt = `Image 1 is the REFERENCE for the ${identity.type} "${identity.name}". Image 2 is a newly generated creative.
Locked identity: ${profile}
Identity anchors: ${(identity.anchors || []).join('; ') || 'none'}
Rules that must hold: ${(identity.rules || []).join('; ') || 'none'}
Be STRICT. A lookalike is NOT the same: if facial structure, hairstyle, beard, glasses, watch or printed logo differ, score that aspect below 40.
${lockScene ? 'Background, room and lighting MUST also match the reference.' : 'Pose, lighting and background MAY differ unless a rule forbids it.'}
Score each aspect 0-100 (100 = indistinguishable from reference):
${defs.map(([k, , d]) => `- ${k}: ${d}`).join('\n')}
Return JSON: {"aspects": {${defs.map(([k]) => `"${k}": {"score": 0, "diff": "specific difference"}`).join(', ')}}, "mismatches": ["specific differences"], "suggestions": ["prompt changes that would fix them"]}`;

    const out = await chat({ model: config.ollama.visionModel, content: prompt, images: [refB64, genB64], json: true });

    const aspects = defs.map(([key, weight]) => {
      const a = out.aspects?.[key];
      return { key, weight, score: a && a.score != null ? clamp(a.score) : null, diff: a?.diff || '' };
    });

    // deterministic checks VLM ke upar
    if (identity.type === 'character') {
      const f = await faceScore(refB64, genB64);
      const face = aspects.find((a) => a.key === 'face');
      if (f && face) {
        face.diff = `${face.diff} (face-embedding similarity ${f.similarity.toFixed(2)})`.trim();
        face.score = face.score == null ? f.score : Math.min(face.score, f.score);
      }
    }
    const t = await textScore(identity, genB64);
    if (t) aspects.push({ key: 'text_ocr', weight: 2, score: t.score, diff: `expected words [${t.expected.join(', ')}] but read "${t.read}"` });

    const score = combineScores(aspects) ?? clamp(out.score);
    checks.push({ identityId: identity._id, name: identity.name, score, aspects: Object.fromEntries(aspects.map((a) => [a.key, a.score])) });

    aspects.filter((a) => a.score != null && a.score < 70).forEach((a) => mismatches.push(`[${identity.name}] ${a.key} ${a.score}/100: ${a.diff}`));
    toList(out.mismatches).forEach((m) => mismatches.push(`[${identity.name}] ${m}`));
    toList(out.suggestions).forEach((s) => suggestions.push(s));
  }

  if (!checks.length) return { score: null, checks, mismatches, suggestions };
  // sabse kamzor identity pura result decide kare (average se galat face chhup jaata tha)
  const score = Math.min(...checks.map((c) => c.score));
  return { score, checks, mismatches, suggestions };
}

/** Improve prompt using mismatches. Falls back to a deterministic append if the LLM fails. */
export async function improvePrompt({ prompt, mismatches, suggestions }) {
  const fallback = `${prompt}\n\nCORRECTIONS (previous attempt drifted): ${[...mismatches, ...suggestions].join('; ')}. Follow the locked identity details exactly.`;
  try {
    const out = await chat({
      model: config.ollama.textModel,
      json: true,
      content: `Rewrite this image-generation prompt so the locked identity details are more explicit and the listed mismatches are fixed. Keep the campaign scene, composition and style unchanged.
PROMPT:\n${prompt}\n\nMISMATCHES:\n${mismatches.join('\n')}\n\nSUGGESTIONS:\n${suggestions.join('\n')}\n
Return JSON: {"prompt": "the improved prompt"}`,
    });
    return typeof out.prompt === 'string' && out.prompt.length > 20 ? out.prompt : fallback;
  } catch {
    return fallback;
  }
}
