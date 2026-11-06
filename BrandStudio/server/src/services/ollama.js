import config from '../config.js';
import { fieldsFor, FIELD_HINTS, isFilled, TARGETS } from './lockSchema.js';

const badJson = (msg) => Object.assign(new Error(msg), { code: 'BAD_JSON' });

// Model kabhi comma bhool jata hai ya JSON beech me kat jata hai -> repair karke parse karo.
function closeJson(s) {
  const stack = [];
  let inStr = false, esc = false;
  for (const c of s) {
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/[,:\s]+$/, '');
  while (stack.length) s += stack.pop() === '{' ? '}' : ']';
  return s;
}

export function parseJson(text) {
  try { return JSON.parse(text); } catch { /* repair below */ }
  let s = String(text).replace(/```json|```/gi, '').trim();
  const start = s.indexOf('{');
  if (start < 0) throw badJson('Model did not return JSON');
  s = s.slice(start);
  try { return JSON.parse(s.slice(0, s.lastIndexOf('}') + 1)); } catch { /* keep repairing */ }
  s = s.replace(/,\s*([}\]])/g, '$1')                                   // trailing commas
       .replace(/("|\]|\}|\d|true|false|null)(\s*\n\s*)(")/g, '$1,$2$3'); // missing comma between lines
  for (let i = 0; i < 80 && s.length; i++) {                              // cut broken tail step by step
    try { return JSON.parse(closeJson(s)); } catch { /* trim */ }
    const cut = s.lastIndexOf(',');
    if (cut < 0) break;
    s = s.slice(0, cut);
  }
  throw badJson('Model returned broken JSON');
}

async function chatOnce({ model, content, images, json = false, numPredict = 3500, timeoutMs = 240000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.ollama.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        stream: false,
        think: false, // qwen3 / qwen3-vl thinking mode off (JSON jawab jaldi + saaf)
        keep_alive: config.ollama.keepAlive,
        // json=true -> 'json' mode, json=<schema object> -> structured output (kam broken JSON, ek hi pass)
        format: json ? (typeof json === 'object' ? json : 'json') : undefined,
        options: { temperature: 0.2, num_ctx: 8192, num_predict: numPredict }, // bada JSON beech me na kate
        messages: [{ role: 'user', content, ...(images?.length ? { images } : {}) }],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const text = data.message?.content || '';
    return json ? parseJson(text) : text;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Ollama request timed out');
    if (e.cause?.code === 'ECONNREFUSED') throw new Error('Ollama not reachable (is `ollama serve` running?)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(opts) {
  try {
    return await chatOnce(opts);
  } catch (e) {
    if (opts.json && e.code === 'BAD_JSON') return chatOnce(opts); // ek baar auto-retry
    throw e;
  }
}

export async function ping() {
  try {
    const r = await fetch(`${config.ollama.url}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

const asText = (v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v ? JSON.stringify(v) : String(v ?? ''));

const asList = (v) => (Array.isArray(v) ? v.map(asText).map((x) => x.trim()).filter(Boolean) : []);

const keyLines = (keys) => keys.map((k) => `- ${k}: ${FIELD_HINTS[k] || 'precise visual description'}`).join('\n');

const CHUNK = 10;
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

/**
 * Reference image -> detailed profile (face / glasses / OCR text / objects / materials / colors / lighting / camera /
 * pose / depth / quality ...) + identityAnchors + rules.
 *
 * Fields chhote chunks (10-10) me poochhe jaate hain: JSON kam toota hai, aur har chunk ke baad onProgress() chalta hai
 * (DB me save -> Lock % page par badhta dikhta hai). Last me jo fields khaali rah gaye unhe ek baar dobara poochha jaata hai.
 */
export async function understandIdentity({ type, name, description, imageBase64, onProgress }) {
  const keys = fieldsFor(type);
  const notes = description ? `Notes from the user: ${description}.` : '';
  const header = `You are analysing a reference image of a ${type} called "${name}". ${notes}
Describe ONLY what is actually visible, precisely enough that an image model could recreate the exact same ${type}. Never invent text or details that are not visible.
Fill EVERY requested field. If something is genuinely absent write "none" (e.g. glasses: "none"). Never leave a field empty and never write "unknown".`;

  const profile = {};
  let rules = [];
  let anchors = [];
  const emit = async () => { if (onProgress) await onProgress({ profile: { ...profile }, rules, anchors }); };
  const call = (content) => chat({ model: config.ollama.visionModel, content, images: [imageBase64], json: true });

  const askFields = async (ks) => {
    const out = await call(`${header}
Fields:
${keyLines(ks)}
Return JSON exactly like:
{"profile":{${ks.map((k) => `"${k}":"..."`).join(',')}}}`);
    for (const [k, v] of Object.entries(out.profile || out)) {
      if (ks.includes(k) && isFilled(asText(v))) profile[k] = asText(v);
    }
  };

  // run a list of chunks; bad-JSON in one chunk is tolerated (filled later), real errors (404, not reachable...) stop at once
  const runChunks = async (list, label) => {
    let done = 0;
    for (const ks of chunk(list, CHUNK)) {
      try { await askFields(ks); } catch (e) { if (e.code !== 'BAD_JSON') throw e; console.warn(`[identity] ${label}: chunk skipped (${e.message})`); }
      done += 1;
      console.log(`[identity] ${name}: ${label} ${done}/${Math.ceil(list.length / CHUNK)} - ${Object.keys(profile).length}/${keys.length} fields`);
      await emit();
    }
  };

  // FAST PATH: saari fields + anchors + rules ek hi call me (JSON schema). Fail ho to purana chunk flow chalega.
  const str = { type: 'string' };
  const schema = {
    type: 'object',
    properties: {
      profile: { type: 'object', properties: Object.fromEntries(keys.map((k) => [k, str])), required: keys },
      identityAnchors: { type: 'array', items: str },
      rules: { type: 'array', items: str },
    },
    required: ['profile', 'identityAnchors', 'rules'],
  };
  try {
    const out = await chat({
      model: config.ollama.visionModel, images: [imageBase64], json: schema, numPredict: 2500,
      content: `${header}
Fields:
${keyLines(keys)}
Also return:
- "identityAnchors": 5-8 short, unique visual locks that must survive regeneration (exact logo text, signature accessory, distinctive feature)
- "rules": 3-6 short rules that must stay identical in every creative
Return JSON with keys "profile" (all fields above), "identityAnchors", "rules".`,
    });
    for (const [k, v] of Object.entries(out.profile || {})) if (keys.includes(k) && isFilled(asText(v))) profile[k] = asText(v);
    anchors = asList(out.identityAnchors).slice(0, 10);
    rules = asList(out.rules);
    console.log(`[identity] ${name}: single pass - ${Object.keys(profile).length}/${keys.length} fields`);
  } catch (e) { if (e.code !== 'BAD_JSON') throw e; console.warn(`[identity] single pass skipped (${e.message}) - chunk mode`); }
  await emit();

  // jo fields single pass me nahi aaye wahi chunk me poochho (pehle poora 'fields' pass chalta tha)
  const left = keys.filter((k) => !isFilled(profile[k]));
  if (left.length) await runChunks(left, 'fields');

  // anchors + rules (sirf tab jab single pass se nahi mile)
  if (!anchors.length || !rules.length) try {
    const out = await call(`${header}
Already captured: ${JSON.stringify(profile).slice(0, 3000)}
Return:
- "identityAnchors": 5-8 short, unique visual locks that must survive regeneration (exact logo text, signature accessory, distinctive feature)
- "rules": 3-6 short rules that must stay identical in every creative
Return JSON exactly like: {"identityAnchors":["..."],"rules":["..."]}`);
    anchors = asList(out.identityAnchors).slice(0, 10);
    rules = asList(out.rules);
  } catch (e) { if (e.code !== 'BAD_JSON') throw e; console.warn('[identity] anchors/rules skipped:', e.message); }
  await emit();

  // fill pass: only fields that are still empty
  const missing = keys.filter((k) => !isFilled(profile[k]));
  if (missing.length) {
    console.log(`[identity] ${name}: fill pass for ${missing.length} missing fields`);
    try { await runChunks(missing, 'fill'); } catch (e) { console.warn('[identity] fill pass failed:', e.message); }
  }

  if (!Object.keys(profile).length) throw new Error('Model ne koi detail return nahi ki - model/Ollama check karo');
  profile.summary = profile.summary || asText(profile.face || profile.shape || profile.location || profile.visualLanguage || '').slice(0, 160);
  return { profile, rules, anchors };
}

/**
 * Freeform image -> detailed generative prompt (Prompt Gallery style).
 * Uses vision model; returns structured fields + paragraph + platform variants.
 */
export async function imageToPrompt(imageBase64) {
  const content = `You are a world-class AI image prompt engineer. Reverse-engineer the image into EXTREMELY DETAILED generative JSON that can recreate the same subject, face, style and composition.

#1 priority: SUBJECT IDENTITY + FACE FIDELITY when a person is visible. Prefer over-detailing. Infer only what is visually supported. Output ONLY valid JSON (no markdown).

Return JSON exactly in this shape:
{
  "promptText": "one long natural English paragraph ready to paste into an image model",
  "subject": "main subject description",
  "style": "art / photo style",
  "lighting": "lighting description",
  "mood": "mood / atmosphere",
  "camera": "camera / lens / framing",
  "faceDescription": "detailed face if person visible, else empty string",
  "identityAnchors": ["short visual locks that must stay identical"],
  "negativePrompt": "comma-separated things to avoid",
  "colors": ["dominant colors"],
  "materials": ["materials / textures"],
  "mustPreserve": ["critical details that must not change"],
  "objects": ["key objects in scene"],
  "aspectRatio": "e.g. 1:1 or 16:9 or 3:4",
  "consistencyNotes": "notes for multi-shot consistency",
  "platformPrompts": {
    "raw": "same as promptText or slightly cleaned",
    "midjourney": "midjourney-style prompt with --ar --style raw etc",
    "flux": "flux-style prompt",
    "sdxl": "sdxl-style prompt"
  }
}`;

  const out = await chat({
    model: config.ollama.visionModel,
    content,
    images: [imageBase64],
    json: true,
    numPredict: 4000,
    timeoutMs: 300000,
  });

  const p = out.promptText || out.prompt || '';
  if (!p && !out.subject) throw new Error('Model ne koi prompt return nahi kiya');
  return {
    promptText: p || [out.subject, out.style, out.lighting, out.mood, out.camera].filter(Boolean).join(', '),
    subject: out.subject || '',
    style: out.style || '',
    lighting: out.lighting || '',
    mood: out.mood || '',
    camera: out.camera || '',
    faceDescription: out.faceDescription || '',
    identityAnchors: Array.isArray(out.identityAnchors) ? out.identityAnchors : [],
    negativePrompt: out.negativePrompt || '',
    colors: Array.isArray(out.colors) ? out.colors : [],
    materials: Array.isArray(out.materials) ? out.materials : [],
    mustPreserve: Array.isArray(out.mustPreserve) ? out.mustPreserve : [],
    objects: Array.isArray(out.objects) ? out.objects : [],
    aspectRatio: out.aspectRatio || '',
    consistencyNotes: out.consistencyNotes || '',
    platformPrompts: out.platformPrompts || {
      raw: p,
      midjourney: p,
      flux: p,
      sdxl: p,
    },
  };
}
