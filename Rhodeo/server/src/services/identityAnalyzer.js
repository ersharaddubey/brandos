import Identity from '../models/Identity.js';
import { understandIdentity } from './ollama.js';
import { assetBase64 } from './assets.js';
import config from '../config.js';

export async function analyzeIdentity(id) {
  const doc = await Identity.findById(id).populate('referenceAssetIds');
  if (!doc) return;
  // har chunk ke baad partial result DB me save -> page par Lock % live badhta hai
  const saveProgress = ({ profile, rules, anchors }) =>
    Identity.updateOne({ _id: id }, { $set: { profile, rules, anchors } });
  try {
    const ref = doc.referenceAssetIds[0];
    if (!ref) throw new Error('No reference image');
    const { profile, rules, anchors } = await understandIdentity({
      type: doc.type, name: doc.name, description: doc.description,
      imageBase64: await assetBase64(ref, config.ollama.analyzeMaxPx), onProgress: saveProgress,
    });
    await Identity.updateOne({ _id: id }, { $set: { profile, rules, anchors, status: 'draft' }, $unset: { analysisError: 1 } });
  } catch (e) {
    // jo partial profile mil chuka hai wo bacha rehta hai
    await Identity.updateOne({ _id: id }, { $set: { status: 'error', analysisError: e.message } });
  }
}