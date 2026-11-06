/**
 * Prompt compiler: locked identity -> copy-paste prompt (koi photo kisi ko nahi jaati).
 * Ollama ki zarurat nahi - sab template se banta hai, isliye instant.
 *
 * Output:
 *   json       structured spec (identity + scene + negative)
 *   paragraph  natural English paragraph  (Gemini / GPT-image / Ideogram / Copilot)
 *   blocks     { identity, scene } - identity block har baar word-to-word same, sirf scene badalta hai
 *   flux       { prompt, negative }       (Flux / SDXL / Leonardo)
 *   midjourney "..." --ar --style raw --no ...
 */
import { identityProfile } from './lockSchema.js';

const NOISE = /^(none|n\/a|na|unknown|unclear|not (visible|specified|available|applicable|clear|detected)|-+|\?+|\.{2,}|…)$/i;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().replace(/[.;,\s]+$/, '');
const get = (p, k) => { const s = clean(p?.[k]); return s && !NOISE.test(s) ? s : ''; };
const isNone = (p, k) => /^none$/i.test(clean(p?.[k]));
const low = (s) => (s && !/^[A-Z]{2,}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sentence = (s) => { const t = clean(s); return t ? `${cap(t)}.` : ''; };
const list = (a) => a.filter(Boolean).join(', ');
const uniq = (a) => [...new Set(a.map(clean).filter(Boolean))];
const words = (s) => clean(s).split(' ').filter(Boolean).length;
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\n,]/)).map(clean).filter(Boolean);

const ORDER = { character: 0, product: 1, brand: 2, environment: 3 };

const BASE_NEGATIVE = ['blurry', 'low quality', 'distorted face', 'extra fingers', 'deformed hands', 'watermark', 'extra text', 'misspelled text'];
const TYPE_NEGATIVE = {
  character: ['different person', 'changed hairstyle', 'glasses added or removed', 'different clothing'],
  product: ['changed logo', 'different shape', 'different color'],
  environment: ['different room layout', 'missing furniture', 'different wall art', 'wrong camera move'],
  brand: ['different logo', 'wrong brand colors', 'different typography', 'wrong emotional voice', 'off-brief messaging'],
};

// lamba value beech se na kate: comma-clauses jodte jao jab tak limit na aaye
const shortText = (t, n = 90) => {
  if (t.length <= n) return t;
  const out = [];
  for (const part of t.split(/,\s*/)) {
    if ([...out, part].join(', ').length > n) break;
    out.push(part);
  }
  return out.length ? out.join(', ') : t.slice(0, n).replace(/\s+\S*$/, '');
};

/** text/logo: image models text me kamzor hain, isliye chhota rakho aur quotes me do */
const textLine = (p) => {
  const t = get(p, 'textDetected');
  return t ? `Any visible text must read exactly: "${shortText(t)}"` : '';
};

const common = (p) => [
  get(p, 'materials') && `Materials: ${get(p, 'materials')}${get(p, 'textures') ? `; textures: ${low(get(p, 'textures'))}` : ''}`,
  get(p, 'colors') && `Colour palette: ${get(p, 'colors')}`,
  get(p, 'objects') && `Objects and props: ${get(p, 'objects')}`,
  textLine(p),
];

const IDENTITY = {
  character(p, keepRef) {
    const build = get(p, 'bodyType').replace(/\s*(body|build)(\s*type)?$/i, '');
    const face = [
      get(p, 'face'), get(p, 'faceShape') && `${low(get(p, 'faceShape'))} face shape`,
      get(p, 'skinTone') && `${low(get(p, 'skinTone'))} skin tone`,
      get(p, 'eyes') && `eyes: ${low(get(p, 'eyes'))}`, get(p, 'eyebrows') && `eyebrows: ${low(get(p, 'eyebrows'))}`,
      get(p, 'nose') && `nose: ${low(get(p, 'nose'))}`, get(p, 'lips') && `lips: ${low(get(p, 'lips'))}`,
      get(p, 'jawline') && `jawline: ${low(get(p, 'jawline'))}`, get(p, 'skinMarks') && `skin marks: ${low(get(p, 'skinMarks'))}`,
    ];
    const hair = uniq([get(p, 'hair'), get(p, 'hairColor'), get(p, 'hairStyle')]);
    return [
      get(p, 'appearance') ? cap(get(p, 'appearance')) : 'A person',
      build && `Body type: ${low(build)}`,
      face.some(Boolean) && `Face: ${list(face)}`,
      hair.length && `Hair: ${list(hair.map(low))}`,
      isNone(p, 'facialHair') ? 'Clean-shaven' : get(p, 'facialHair') && `Facial hair: ${low(get(p, 'facialHair'))}`,
      isNone(p, 'glasses') ? 'No glasses' : get(p, 'glasses') && `Eyewear: ${low(get(p, 'glasses'))}`,
      get(p, 'clothing') && `Wearing ${low(get(p, 'clothing'))}`,
      get(p, 'accessories') && `Accessories: ${low(get(p, 'accessories'))}`,
      get(p, 'bodyDynamics') && `Body dynamics: ${low(get(p, 'bodyDynamics'))}`,
      get(p, 'gestureLanguage') && `Gesture: ${low(get(p, 'gestureLanguage'))}`,
      get(p, 'makeup') && `Makeup: ${low(get(p, 'makeup'))}`,
      ...(keepRef ? [get(p, 'pose') && `Pose: ${low(get(p, 'pose'))}`, get(p, 'gaze') && `Gaze: ${low(get(p, 'gaze'))}`, get(p, 'expression') && `Expression: ${low(get(p, 'expression'))}`] : []),
      ...common(p),
    ];
  },
  product(p) {
    return [
      get(p, 'shape') && `Product shape: ${low(get(p, 'shape'))}`,
      get(p, 'designDetails') && `Design details: ${low(get(p, 'designDetails'))}`,
      get(p, 'proportions') && `Proportions: ${low(get(p, 'proportions'))}`,
      get(p, 'components') && `Components: ${low(get(p, 'components'))}`,
      get(p, 'material') && `Material: ${low(get(p, 'material'))}${get(p, 'finish') ? `, ${low(get(p, 'finish'))} finish` : ''}`,
      get(p, 'texture') && `Texture: ${low(get(p, 'texture'))}`,
      get(p, 'color') && `Colour: ${low(get(p, 'color'))}${get(p, 'colorPalette') ? `, with ${low(get(p, 'colorPalette'))}` : ''}`,
      get(p, 'logo') && `Logo: ${low(get(p, 'logo'))}`,
      get(p, 'objects') && `Objects and props: ${get(p, 'objects')}`,
      textLine(p),
    ];
  },
  environment(p) {
    const weather = get(p, 'weather');
    return [
      list([get(p, 'location'), get(p, 'architecture') && low(get(p, 'architecture'))]) && `Setting: ${list([get(p, 'location'), get(p, 'architecture') && low(get(p, 'architecture'))])}`,
      get(p, 'layout') && `Layout: ${get(p, 'layout')}`,
      get(p, 'landmarks') && `Fixed features that must stay the same: ${low(get(p, 'landmarks'))}`,
      get(p, 'atmosphere') && `Mood: ${low(get(p, 'atmosphere'))}`,
      get(p, 'timeOfDay') && `Time of day: ${low(get(p, 'timeOfDay'))}`,
      weather && !/^(indoors?|inside)$/i.test(weather) && `Weather: ${low(weather)}`,
      get(p, 'lighting') && `Lighting: ${low(get(p, 'lighting'))}${get(p, 'lightingDirection') ? `, ${low(get(p, 'lightingDirection'))}` : ''}${get(p, 'colorTemperature') ? `, ${low(get(p, 'colorTemperature'))} colour temperature` : ''}`,
      get(p, 'cameraMovement') && `Camera move: ${low(get(p, 'cameraMovement'))}`,
      get(p, 'cameraAngle') && `Angle: ${low(get(p, 'cameraAngle'))}`,
      get(p, 'shotTypes') && `Shot types: ${low(get(p, 'shotTypes'))}`,
      get(p, 'editRhythm') && `Edit rhythm: ${low(get(p, 'editRhythm'))}`,
      get(p, 'pacing') && `Pacing: ${low(get(p, 'pacing'))}`,
      ...common(p),
    ];
  },
  brand(p) {
    return [
      get(p, 'visualLanguage') && `Visual language: ${low(get(p, 'visualLanguage'))}`,
      get(p, 'style') && `Style: ${low(get(p, 'style'))}`,
      get(p, 'mood') && `Mood: ${low(get(p, 'mood'))}`,
      get(p, 'colorGrade') && `Color grade: ${low(get(p, 'colorGrade'))}`,
      get(p, 'colors') && `Brand colours: ${low(get(p, 'colors'))}${get(p, 'accentColors') ? `, accents ${low(get(p, 'accentColors'))}` : ''}`,
      get(p, 'composition') && `Composition rules: ${low(get(p, 'composition'))}`,
      get(p, 'framing') && `Framing: ${low(get(p, 'framing'))}`,
      get(p, 'typography') && `Typography: ${low(get(p, 'typography'))}`,
      get(p, 'logo') && `Logo: ${low(get(p, 'logo'))}`,
      get(p, 'imagery') && `Imagery: ${low(get(p, 'imagery'))}`,
      get(p, 'materials') && `Materials: ${get(p, 'materials')}`,
      get(p, 'grain') && `Grain: ${low(get(p, 'grain'))}`,
      get(p, 'toneOfVoice') && `Voice: ${low(get(p, 'toneOfVoice'))}`,
      get(p, 'emotionalTone') && `Emotional tone: ${low(get(p, 'emotionalTone'))}`,
      get(p, 'energy') && `Energy: ${low(get(p, 'energy'))}`,
      get(p, 'campaignBrief') && `Campaign brief: ${get(p, 'campaignBrief')}`,
      get(p, 'forbiddenClaims') && `Forbidden: ${get(p, 'forbiddenClaims')}`,
      get(p, 'mustSay') && `Must say: ${get(p, 'mustSay')}`,
      get(p, 'targetFeeling') && `Target feeling: ${low(get(p, 'targetFeeling'))}`,
      textLine(p),
    ];
  },

};

/** reference ke composition / camera / style - sirf tab jab user ne apna scene nahi diya */
function refScene(profiles) {
  const first = (k) => profiles.map((p) => get(p, k)).find(Boolean) || '';
  const camera = list([first('camera'), first('lens'), first('depthOfField')].map(low));
  const comp = list([first('composition')].map(low));
  const layers = [first('foreground') && `foreground: ${low(first('foreground'))}`, first('midground') && `midground: ${low(first('midground'))}`, first('background') && `background: ${low(first('background'))}`];
  const style = list([first('style'), first('colorGrade'), first('imageQuality')].map(low));
  return { camera, composition: list([comp, ...layers]), style, aspect: first('aspectRatio') };
}

const validRatio = (r) => (/^\d{1,2}:\d{1,2}$/.test(clean(r)) ? clean(r) : '');

export function compilePrompt({ identities, goal, scene, composition, style, aspectRatio, avoid, focus, corrections }) {
  const ids = [...identities].sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));
  const keepRef = !clean(scene); // scene diya nahi => reference ka pose/background/lighting bhi lock
  const profiles = ids.map((i) => identityProfile(i, { includeScene: keepRef || i.type === 'environment' }));
  const ref = keepRef || !clean(composition) || !clean(style) ? refScene([...profiles].reverse()) : {};

  const aspect = validRatio(aspectRatio) || validRatio(ref.aspect) || '1:1';
  const camera = !clean(composition) && ref.camera ? ref.camera : '';
  const comp = clean(composition) || (keepRef ? ref.composition : '');
  const styleText = clean(style) || ref.style || '';
  const focusText = clean(focus);

  // ---- identity block (har baar same) ----
  const idSentences = [];
  ids.forEach((i, n) => {
    const raw = (IDENTITY[i.type] || IDENTITY.product)(profiles[n], keepRef).filter(Boolean).map(sentence);
    idSentences.push(...raw);
  });
  const anchors = uniq(ids.flatMap((i) => i.anchors || [])).slice(0, 8);
  const rules = uniq(ids.flatMap((i) => i.rules || [])).slice(0, 6);
  if (anchors.length) idSentences.push(sentence(`Keep these exact details: ${anchors.join('; ')}`));
  if (rules.length) idSentences.push(sentence(`Do not change: ${rules.join('; ')}`));
  const fixes = uniq(corrections || []).slice(0, 6);
  if (fixes.length) idSentences.push(sentence(`Correct these issues from the previous attempt: ${fixes.join('; ')}`));
  if (focusText) {
    idSentences.unshift(
      sentence(`Focus only on this from the reference: ${focusText}. Do not invent other products; keep exact materials and logos of that subject`)
    );
  }

  // ---- scene block (har campaign me badalta hai) ----
  const sceneSentences = [
    clean(goal) && sentence(`Purpose: ${goal}`),
    clean(scene)
      ? sentence(`Scene: ${scene}`)
      : 'Scene: keep the same setting, background, lighting and mood as described above.',
    comp && sentence(`Composition: ${comp}`),
    camera && sentence(`Camera: ${camera}`),
    styleText && sentence(`Style: ${styleText}`),
  ].filter(Boolean);

  const negative = uniq([...BASE_NEGATIVE, ...ids.flatMap((i) => TYPE_NEGATIVE[i.type] || []), ...lines(avoid)]);
  const intro = `Create a new image in ${aspect} aspect ratio.`;
  const identityBlock = idSentences.join(' ');
  const sceneBlock = sceneSentences.join(' ');
  const paragraph = [intro, identityBlock, sceneBlock, `Avoid: ${negative.slice(0, 10).join(', ')}.`].filter(Boolean).join(' ');

  // ---- JSON ----
  const details = (p) => Object.fromEntries(Object.keys(p).filter((k) => k !== 'summary' && get(p, k)).map((k) => [k, get(p, k)]));
  const json = {
    prompt_version: 1,
    aspect_ratio: aspect,
    identity: ids.map((i, n) => ({ name: i.name, type: i.type, details: details(profiles[n]), must_keep: (i.anchors || []).map(clean).filter(Boolean), rules: (i.rules || []).map(clean).filter(Boolean) })),
    scene: Object.fromEntries(Object.entries({ purpose: clean(goal), scene: clean(scene) || 'same as reference', composition: comp, camera, style: styleText }).filter(([, v]) => v)),
    ...(fixes.length ? { corrections: fixes } : {}),
    negative_prompt: negative,
  };

  // ---- Flux / SDXL tags + Midjourney ----
  const PRIORITY = {
    character: ['appearance', 'faceShape', 'skinTone', 'hair', 'hairColor', 'hairStyle', 'facialHair', 'glasses', 'clothing', 'accessories', 'objects'],
    product: ['shape', 'material', 'finish', 'color', 'logo', 'designDetails'],
    environment: ['location', 'architecture', 'landmarks', 'lighting', 'colors', 'objects', 'cameraMovement'],
    brand: ['visualLanguage', 'colors', 'typography', 'logo', 'style', 'colorGrade', 'toneOfVoice', 'mood'],
  };
  const tagBits = ids.flatMap((i, n) => (PRIORITY[i.type] || []).map((k) => get(profiles[n], k)).filter(Boolean).map((v) => low(shortText(v, 60))));
  const capWords = (parts, n) => { const out = []; let w = 0; for (const x of parts) { if (w + words(x) > n) break; out.push(x); w += words(x); } return out; };
  const fluxParts = uniq([styleText && low(styleText), ...tagBits, ...anchors.map(low), clean(scene) && low(clean(scene)), comp && low(comp), 'sharp focus', 'highly detailed']);
  const flux = { prompt: capWords(fluxParts, 110).join(', '), negative: negative.join(', ') };
  const [w, h] = aspect.split(':');
  const midjourney = `${capWords(fluxParts, 45).join(', ')} --ar ${w}:${h} --style raw --no ${negative.slice(0, 6).join(', ')}`;

  const notes = [
    'Har site par same model + same seed rakho (seed option ho to).',
    'Identity block har baar word-to-word copy karo, sirf scene block badlo.',
    'Mug / board par text ho to chhota rakho, models spelling bigaad dete hain.',
    ...(words(paragraph) > 230 ? ['Prompt lamba hai (230+ words) - anchors / rules kam karke dekho.'] : []),
    ...(ids.some((i) => i.status !== 'locked') ? ['Kuch identity abhi draft hai - lock karne par version freeze ho jaata hai.'] : []),
  ];

  return { json, paragraph, blocks: { identity: [intro, identityBlock].join(' '), scene: sceneBlock }, flux, midjourney, notes, stats: { words: words(paragraph), chars: paragraph.length } };
}
