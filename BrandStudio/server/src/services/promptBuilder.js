import { identityProfile } from './lockSchema.js';

// includeScene=true -> reference ka lighting / background / camera bhi prompt me jaata hai.
// Environment identity me ye hamesha jaata hai; baaki identities me tab jab campaign ne apna scene nahi diya
// (matlab "reference wala scene hi rakho").
const describe = (i, includeScene) => {
  const p = Object.entries(identityProfile(i, { includeScene }))
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  const anchors = (i.anchors || []).length ? ` ANCHORS (never change): ${i.anchors.join('; ')}.` : '';
  const rules = (i.rules || []).length ? ` MUST KEEP: ${i.rules.join('; ')}.` : '';
  return `${i.type.toUpperCase()} "${i.name}" - ${p}.${anchors}${rules}`;
};

export function renderTemplate(body, vars) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

const REFERENCE_LOCK =
  'The attached reference image is the source of truth. Keep the SAME person (face, hair, beard, glasses), the SAME clothing, watch and held props, ' +
  'and every logo / text exactly as in the reference. Change ONLY what the campaign below asks for.';

/** Identity + Campaign + Environment + Style + Composition -> structured creative prompt */
export function buildPrompt({ identities, goal, scene, composition, style, avoid, focus, templateBody }) {
  const keepScene = !scene; // scene diya hi nahi => reference scene lock
  const env = identities.find((i) => i.type === 'environment');
  const focusText = String(focus || '').trim();
  const vars = {
    lock: REFERENCE_LOCK,
    identity: identities.filter((i) => i.type !== 'environment').map((i) => describe(i, keepScene)).join('\n'),
    environment: env ? describe(env, true) : '',
    goal: goal || '',
    scene: scene || '',
    composition: composition || '',
    style: style || '',
    avoid: avoid || '',
    focus: focusText,
  };
  if (templateBody) {
    const rendered = renderTemplate(templateBody, vars).trim();
    return [
      rendered,
      focusText && `FOCUS ONLY: Generate only this from the reference — ${focusText}. Ignore other objects in the plate unless needed for context.`,
      avoid && `AVOID: ${avoid}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Campaign pehle, lambi identity details baad me: FLUX/T5 ~512 tokens ke baad prompt kaat deta hai,
  // aur identity ka bhaar reference image uthati hai (text nahi).
  return [
    vars.lock,
    focusText &&
      `FOCUS ONLY: From the reference image, generate ONLY — ${focusText}. Do not invent other products. Keep exact materials, colors and logos of that subject.`,
    goal && `CAMPAIGN GOAL: ${goal}`,
    scene && `SCENE: ${scene}`,
    keepScene && !scene && 'SCENE: keep the exact room, background, lighting and mood of the reference.',
    composition && `COMPOSITION: ${composition}`,
    style && `STYLE: ${style}`,
    avoid && `AVOID: ${avoid}`,
    vars.identity && `IDENTITY (must match the reference):\n${vars.identity}`,
    vars.environment && `ENVIRONMENT:\n${vars.environment}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
