import Generation from '../models/Generation.js';
import Identity from '../models/Identity.js';
import PromptTemplate from '../models/PromptTemplate.js';
import Asset from '../models/Asset.js';
import { buildPrompt } from './promptBuilder.js';
import { generateImage } from './generator.js';
import { ingestImage, assetBase64 } from './assets.js';
import { checkConsistency, improvePrompt } from './consistency.js';
import { runLangflowPrompt } from './langflow.js';
import { notifyN8n } from './integrations.js';

/** Generate -> Check -> Detect mismatch -> Improve -> Regenerate (until threshold or maxAttempts) */
export async function runGeneration(genId) {
  const gen = await Generation.findById(genId);
  if (!gen) throw new Error(`Generation not found: ${genId}`);
  try {
    gen.status = 'running';
    gen.progress = 1;
    gen.currentStep = 'loading-identities';
    gen.startedAt = new Date();
    await gen.save();
    const identities = await Identity.find({ _id: { $in: gen.identityIds }, status: 'locked' });
    if (!identities.length) throw new Error('No locked identities selected');

    let templateBody;
    if (gen.inputs.templateId) {
      const t = await PromptTemplate.findById(gen.inputs.templateId);
      templateBody = t?.versions.find((v) => v.version === t.currentVersion)?.body;
    }
    let prompt = buildPrompt({ identities, ...gen.inputs, templateBody });
    // Optional Langflow orchestration; failures are explicit rather than silently generating with a different prompt.
    prompt = await runLangflowPrompt(prompt, { identityNames: identities.map((i) => i.name), scene: gen.inputs.scene || '', style: gen.inputs.style || '' });

    // har locked identity ki reference generator ko jaati hai (character pehle, taaki face/main reference priority le)
    const ordered = [...identities].sort((a, b) => (a.type === 'character' ? -1 : 0) - (b.type === 'character' ? -1 : 0));
    const referencesBase64 = [];
    const missingRefs = [];
    for (const idn of ordered) {
      const refId = idn.referenceAssetIds?.[0];
      if (!refId) {
        missingRefs.push(`${idn.name} (${idn.type}): no reference asset`);
        continue;
      }
      const refDoc = await Asset.findById(refId);
      if (!refDoc) {
        missingRefs.push(`${idn.name} (${idn.type}): asset not found`);
        continue;
      }
      try {
        referencesBase64.push(await assetBase64(refDoc));
      } catch (e) {
        if (e?.code === 'ENOENT') {
          missingRefs.push(`${idn.name} (${idn.type}): file missing (${refDoc.filename})`);
          console.warn('[generation] missing reference file', refDoc.filename, idn.name);
        } else {
          throw e;
        }
      }
    }
    if (!referencesBase64.length && missingRefs.length) {
      throw new Error(
        'No usable reference images on disk. Re-upload references for selected identities. Details: ' +
          missingRefs.join('; ')
      );
    }
    if (missingRefs.length) {
      console.warn('[generation] skipped missing refs:', missingRefs.join('; '));
    }
    // scene nahi diya => reference ka background/lighting bhi lock rahega aur check me bhi enforce hoga
    const lockScene = !gen.inputs.scene;

    let best = { n: 0, score: -1 };
    for (let n = 1; n <= gen.settings.maxAttempts; n++) {
      const latest = await Generation.findById(gen._id).select('cancelRequested status');
      if (latest?.cancelRequested || latest?.status === 'cancelled') { gen.status = 'cancelled'; gen.currentStep = 'cancelled'; gen.completedAt = new Date(); break; }
      const attempt = { n, prompt, mismatches: [], suggestions: [], checks: [] };
      gen.currentStep = `generating-${n}`;
      gen.progress = Math.min(10 + Math.round(((n - 1) / gen.settings.maxAttempts) * 70), 80);
      await gen.save();
      const generated = await generateImage({ prompt, referencesBase64, width: gen.inputs.width, height: gen.inputs.height, aspectRatio: gen.inputs.aspectRatio });
      const { buffer } = generated;
      const afterGenerate = await Generation.findById(gen._id).select('cancelRequested status');
      if (afterGenerate?.cancelRequested || afterGenerate?.status === 'cancelled') { gen.status = 'cancelled'; gen.currentStep = 'cancelled'; gen.completedAt = new Date(); break; }
      attempt.seed = generated.seed;
      attempt.width = generated.width;
      attempt.height = generated.height;

      let check = null;
      try {
        check = await checkConsistency({ identities, imageBuffer: buffer, lockScene });
        attempt.score = check.score;
        attempt.checks = check.checks;
        attempt.mismatches = check.mismatches;
        attempt.suggestions = check.suggestions;
      } catch (e) {
        attempt.error = `Consistency check failed: ${e.message}`;
      }

      const { asset } = await ingestImage({
        buffer, kind: 'generated', identityIds: identities.map((i) => i._id),
        campaignId: gen.campaignId, generationId: gen._id, prompt, score: attempt.score ?? undefined,
      });
      attempt.assetId = asset._id;

      gen.attempts.push(attempt);
      gen.currentStep = `checked-${n}`;
      gen.progress = Math.min(15 + Math.round((n / gen.settings.maxAttempts) * 80), 95);
      const sc = attempt.score ?? -1;
      if (sc > best.score || best.n === 0) best = { n, score: sc };
      gen.bestAttempt = best.n;
      await gen.save();

      if (attempt.score == null) {
        // unchecked (Ollama down / no references) -> cannot improve automatically
        attempt.note = 'Unchecked - stopping loop';
        break;
      }
      if (attempt.score >= gen.settings.threshold) {
        attempt.note = 'Passed threshold';
        break;
      }
      if (n < gen.settings.maxAttempts) prompt = await improvePrompt({ prompt, mismatches: attempt.mismatches, suggestions: attempt.suggestions });
    }
    if (gen.status !== 'cancelled') {
      gen.status = 'done';
      gen.progress = 100;
      gen.currentStep = 'completed';
      gen.completedAt = new Date();
    }
  } catch (e) {
    gen.status = gen.cancelRequested ? 'cancelled' : 'error';
    gen.currentStep = gen.cancelRequested ? 'cancelled' : 'failed';
    gen.error = gen.cancelRequested ? undefined : e.message;
  }
  gen.completedAt = gen.completedAt || new Date();
  gen.markModified('attempts');
  await gen.save();
  try { await notifyN8n(`generation.${gen.status}`, { generationId: String(gen._id), status: gen.status, currentStep: gen.currentStep, error: gen.error || null, assetIds: (gen.attempts || []).map((a) => a.assetId).filter(Boolean) }); } catch (e) { console.warn('n8n notification failed:', e.message); }
}
