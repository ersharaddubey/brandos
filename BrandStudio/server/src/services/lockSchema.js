/**
 * Lock schema = "image se kya-kya detail collect karni hai" + Lock % calculator.
 * (Detail list pg4 / Prompt Gallery ke image analysis se li gayi hai: face micro-details,
 *  glasses, OCR text, objects, materials, colors, lighting, camera, pose, depth, quality, anchors.)
 *
 * scope:
 *   'identity' -> prompts + consistency check me enforce hota hai (har creative me same rehna chahiye)
 *   'scene'    -> reference se capture hota hai (record + % me count), par campaign ke hisaab se badal sakta hai
 */

export const TARGETS = { anchors: 5, rules: 3 };

// "unknown / not visible / ..." values lock me count nahi hote. "none" count hota hai (absent bhi ek lock hai, e.g. glasses: none).
export const EMPTY_PATTERN = '^(n\\/a|na|unknown|unclear|not (visible|specified|available|applicable|clear|detected)|\\.{2,}|…|-+|\\?+)$';
const EMPTY_RE = new RegExp(EMPTY_PATTERN, 'i');

export const isFilled = (v) => {
  const s = String(v ?? '').trim();
  return s.length > 0 && !EMPTY_RE.test(s);
};

const G = (key, label, scope, weight, fields) => ({ key, label, scope, weight, fields });

const IDENTITY_GROUPS = {
  character: [
    G('face', 'Face', 'identity', 3, ['face', 'faceShape', 'eyes', 'eyebrows', 'nose', 'lips', 'jawline', 'facialHair', 'skinTone', 'skinMarks', 'expression']),
    G('hair', 'Hair', 'identity', 2, ['hair', 'hairColor', 'hairStyle']),
    G('eyewear', 'Glasses / eyewear', 'identity', 2, ['glasses']),
    G('body', 'Body, pose & performance', 'identity', 2, ['appearance', 'bodyType', 'pose', 'gaze', 'bodyDynamics', 'gestureLanguage']),
    G('outfit', 'Outfit & accessories', 'identity', 2, ['clothing', 'accessories', 'makeup']),
    G('text', 'Text & logos (OCR)', 'identity', 2, ['textDetected']),
    G('objects', 'Objects & props', 'identity', 1, ['objects']),
    G('materials', 'Materials & textures', 'identity', 1, ['materials', 'textures']),
    G('colors', 'Colors', 'identity', 1, ['colors']),
  ],
  product: [
    G('shape', 'Shape & design', 'identity', 3, ['shape', 'designDetails', 'proportions', 'components']),
    G('material', 'Material & finish', 'identity', 2, ['material', 'texture', 'finish']),
    G('color', 'Color', 'identity', 2, ['color', 'colorPalette']),
    G('branding', 'Branding & text (OCR)', 'identity', 3, ['logo', 'textDetected']),
    G('objects', 'Objects & props', 'identity', 1, ['objects']),
  ],
  brand: [
    G('visual', 'Visual identity & style', 'identity', 3, ['visualLanguage', 'style', 'composition', 'mood', 'colorGrade', 'framing', 'grain', 'imageQuality']),
    G('colors', 'Colors', 'identity', 2, ['colors', 'accentColors', 'colorPalette']),
    G('marks', 'Typography & marks (OCR)', 'identity', 3, ['typography', 'logo', 'textDetected']),
    G('imagery', 'Imagery & materials', 'identity', 1, ['imagery', 'materials', 'objects', 'textures']),
    G('voice', 'Brand voice & campaign', 'identity', 3, ['toneOfVoice', 'emotionalTone', 'energy', 'campaignBrief', 'messageHierarchy', 'forbiddenClaims', 'mustSay', 'targetFeeling', 'aspiration', 'storyArc']),
  ],
  environment: [
    G('place', 'Place & architecture', 'identity', 3, ['location', 'architecture', 'layout', 'landmarks']),
    G('atmosphere', 'Atmosphere & light', 'identity', 2, ['atmosphere', 'timeOfDay', 'weather', 'lighting', 'lightingDirection', 'colorTemperature', 'lightQuality']),
    G('camera', 'Camera & motion language', 'identity', 2, ['camera', 'lens', 'depthOfField', 'cameraMovement', 'cameraAngle', 'shotTypes', 'lensLanguage', 'editRhythm', 'pacing', 'transitions', 'durationFeel']),
    G('materials', 'Materials & textures', 'identity', 1, ['materials', 'textures']),
    G('colors', 'Colors', 'identity', 1, ['colors']),
    G('text', 'Text & signage (OCR)', 'identity', 1, ['textDetected']),
    G('objects', 'Objects & props', 'identity', 1, ['objects']),
  ],
};

const SCENE_GROUPS = [
  G('lighting', 'Lighting', 'scene', 1, ['lighting', 'lightingDirection', 'colorTemperature']),
  G('camera', 'Camera & lens', 'scene', 1, ['camera', 'lens', 'depthOfField']),
  G('composition', 'Composition & depth', 'scene', 1, ['composition', 'foreground', 'midground', 'background', 'aspectRatio']),
  G('style', 'Style, grade & quality', 'scene', 1, ['style', 'colorGrade', 'imageQuality']),
];

export const TYPES = Object.keys(IDENTITY_GROUPS);

export const LABELS = {
  textDetected: 'Text / logos (exact OCR)',
  glasses: 'Glasses / eyewear',
  designDetails: 'Design details',
  depthOfField: 'Depth of field',
  lightingDirection: 'Lighting direction',
  colorTemperature: 'Color temperature',
  aspectRatio: 'Aspect ratio',
  colorGrade: 'Color grade',
  imageQuality: 'Image quality (sharpness / grain)',
  facialHair: 'Facial hair',
  skinMarks: 'Skin marks',
  timeOfDay: 'Time of day',
  visualLanguage: 'Visual language',
};

export const FIELD_HINTS = {
  face: 'overall face impression: apparent age range, notable features',
  faceShape: 'face shape and proportions',
  eyes: 'eye shape, color, eyelids, spacing, under-eye',
  eyebrows: 'brow shape, thickness, color',
  nose: 'nose shape and size',
  lips: 'lip shape, fullness, color',
  jawline: 'jaw and chin shape',
  facialHair: 'beard / moustache style and length, or "none"',
  skinTone: 'skin tone and undertone',
  skinMarks: 'moles, freckles, scars, wrinkles, or "none"',
  expression: 'facial expression and mood',
  hair: 'overall hair look',
  hairColor: 'exact hair color incl. highlights',
  hairStyle: 'length, cut, parting, texture, flyaways',
  glasses: 'eyewear: frame shape, color, material, thickness, lens - or "none" if no glasses',
  appearance: 'overall look: gender presentation, age vibe',
  bodyType: 'build / body type',
  pose: 'body direction, posture, hands',
  gaze: 'gaze direction and head angle',
  clothing: 'every garment with color, fabric, fit, pattern',
  accessories: 'watch, jewelry, hat, bag etc. - or "none"',
  makeup: 'makeup details - or "none"',
  textDetected: 'EXACT words of every readable logo / label / sign / clothing text - or "none" if no text is visible',
  objects: 'every distinct physical object or prop visible, comma separated',
  materials: 'main materials visible',
  textures: 'surface textures: weave, grain, gloss / matte',
  colors: 'dominant colors with precise names',
  shape: 'overall silhouette and form',
  designDetails: 'distinctive details: seams, buttons, caps, patterns',
  proportions: 'relative sizes / ratios of the parts',
  components: 'visible parts and attachments',
  material: 'primary material',
  texture: 'surface texture',
  finish: 'gloss / matte / satin, coating',
  color: 'main color(s), exact',
  colorPalette: 'secondary and accent colors',
  logo: 'logo shape, position, size, colors',
  location: 'type of place',
  architecture: 'architectural style and structure',
  layout: 'spatial arrangement of the main elements',
  landmarks: 'distinctive fixed features',
  atmosphere: 'mood and ambience',
  timeOfDay: 'time of day / season',
  weather: 'weather or "indoor"',
  lighting: 'light type, source, quality',
  visualLanguage: 'overall visual language',
  mood: 'emotional voice',
  typography: 'typefaces / lettering style',
  imagery: 'photo / illustration style and typical subjects',
  accentColors: 'accent colors',
  lightingDirection: 'direction of light and shadow quality',
  colorTemperature: 'warm / cool, approx Kelvin',
  camera: 'camera angle / POV and shot type',
  lens: 'focal length look and aperture',
  depthOfField: 'depth of field / bokeh',
  composition: 'framing and subject placement',
  foreground: 'what is in the foreground',
  midground: 'what is in the midground',
  background: 'what is in the background',
  aspectRatio: 'e.g. 1:1, 4:5, 16:9',
  style: 'overall visual style',
  colorGrade: 'color grading look',
  imageQuality: 'sharpness, grain, overall look',
  lightQuality: 'hard / soft light, diffusion, contrast ratio',
  framing: 'framing rules, subject placement, rule of thirds / centered / negative space preference',
  negativeSpace: 'how much negative space is preferred and where',
  grain: 'film grain / digital noise level and character',
  emotionalTone: 'core emotional register of the campaign (e.g. confident, tender, rebellious)',
  energy: 'energy level: calm, energetic, intense, playful',
  campaignBrief: 'one-sentence campaign idea / big idea',
  messageHierarchy: 'primary message then secondary supports',
  storyArc: 'beginning-middle-end feeling or narrative shape',
  toneOfVoice: 'how the brand speaks in this campaign',
  forbiddenClaims: 'things that must never be said or implied',
  mustSay: 'mandatory claims or phrases if any',
  targetFeeling: 'what the viewer should feel after seeing the ad',
  aspiration: 'aspirational identity the campaign sells',
  cameraMovement: 'allowed camera moves: static, slow push-in, handheld, drone, tracking etc.',
  cameraAngle: 'preferred angles and POV',
  shotTypes: 'close-up, medium, wide, extreme etc. rules',
  lensLanguage: 'preferred focal lengths and depth of field feel',
  editRhythm: 'cut speed and rhythm language',
  pacing: 'overall tempo of the edit',
  transitions: 'cut, dissolve, wipe, match-cut rules',
  durationFeel: 'preferred shot length feel (quick cuts vs lingering)',
  musicMood: 'music genre / energy / instruments feel',
  sfxStyle: 'sound design style',
  bodyDynamics: 'how bodies move: fluid, sharp, grounded, floating',
  gestureLanguage: 'signature gestures or movement vocabulary',

};

const humanize = (k) => {
  if (LABELS[k]) return LABELS[k];
  const s = k.replace(/([A-Z])/g, ' $1').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Field groups for a type (identity groups first, then scene groups; duplicate field keys dropped). */
export function fieldGroupsFor(type) {
  const base = IDENTITY_GROUPS[type] || [];
  const used = new Set(base.flatMap((g) => g.fields));
  const scene = SCENE_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => !used.has(f)) })).filter((g) => g.fields.length);
  return [...base, ...scene];
}

export const fieldsFor = (type) => fieldGroupsFor(type).flatMap((g) => g.fields);

export const PROFILE_KEYS = Object.fromEntries(TYPES.map((t) => [t, fieldsFor(t)]));

const sceneFieldSet = (type) => new Set(fieldGroupsFor(type).filter((g) => g.scope === 'scene').flatMap((g) => g.fields));

/** Profile entries that must be enforced in prompts / consistency (scene-capture fields excluded, legacy keys kept). */
export function identityProfile(identity, { includeScene = false } = {}) {
  // includeScene=true -> lighting / camera / background etc. bhi enforce hote hain (reference scene ko lock karna ho)
  const scene = includeScene ? new Set() : sceneFieldSet(identity.type);
  const out = {};
  for (const [k, v] of Object.entries(identity.profile || {})) {
    if (scene.has(k) || !isFilled(v)) continue;
    out[k] = v;
  }
  return out;
}

/** Schema sent to the client (so UI + live % use exactly the same weights / regex). */
export function clientSchema() {
  const types = {};
  for (const t of TYPES) {
    types[t] = fieldGroupsFor(t).map((g) => ({
      key: g.key, label: g.label, scope: g.scope, weight: g.weight,
      fields: g.fields.map((f) => ({ key: f, label: humanize(f), hint: FIELD_HINTS[f] || '' })),
    }));
  }
  return { types, targets: TARGETS, emptyPattern: EMPTY_PATTERN };
}

const countGroup = (key, label, weight, n, target) => {
  const filled = Math.min(n, target);
  return { key, label, scope: 'identity', kind: 'count', weight, filled, total: target, count: n, percent: Math.round((filled / target) * 100), missing: [] };
};

/** Lock % for one identity. percent = weighted detail coverage; lockedPercent = percent only if status === 'locked'. */
export function computeLockStats(doc) {
  const profile = doc.profile || {};
  const mk = (g) => {
    const missing = g.fields.filter((f) => !isFilled(profile[f]));
    const filled = g.fields.length - missing.length;
    return { key: g.key, label: g.label, scope: g.scope, kind: 'fields', weight: g.weight, filled, total: g.fields.length, percent: Math.round((filled / g.fields.length) * 100), missing };
  };
  const fg = fieldGroupsFor(doc.type).map(mk);
  const groups = [
    ...fg.filter((g) => g.scope === 'identity'),
    countGroup('anchors', 'Identity anchors', 3, (doc.anchors || []).length, TARGETS.anchors),
    countGroup('rules', 'Must-preserve rules', 2, (doc.rules || []).length, TARGETS.rules),
    ...fg.filter((g) => g.scope === 'scene'),
  ];
  const wavg = (arr) => {
    const w = arr.reduce((a, g) => a + g.weight, 0);
    return w ? Math.round(arr.reduce((a, g) => a + g.weight * g.percent, 0) / w) : 0;
  };
  const percent = wavg(groups);
  const fieldsFilled = fg.reduce((a, g) => a + g.filled, 0);
  const fieldsTotal = fg.reduce((a, g) => a + g.total, 0);
  const locked = doc.status === 'locked';
  return {
    percent,
    identityPercent: wavg(groups.filter((g) => g.scope === 'identity')),
    scenePercent: wavg(groups.filter((g) => g.scope === 'scene')),
    fieldsFilled, fieldsTotal,
    locked,
    basis: 'coverage', // percent = kitni details bhari hain (coverage), output fidelity NAHI - fidelity consistency score se aata hai
    lockedPercent: locked ? percent : 0,
    groups,
  };
}
