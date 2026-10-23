import { Router } from 'express';
import config from '../config.js';
import { getComfyUIStatus } from '../services/comfyui.js';
import { getA1111Status } from '../services/a1111.js';
import { getInstantIDStatus } from '../services/instantid.js';
import { getGroundedSam2Status, segmentAssetWithGroundedSam2 } from '../services/groundedSam2.js';
import Asset from '../models/Asset.js';
import { wrap } from '../middleware/common.js';
import { integrationStatuses, notifyN8n, qdrantEnsureCollection, qdrantSearch, qdrantUpsert, transformerEmbedImage } from '../services/integrations.js';
import { embedText } from '../services/embedding.js';
import { readAssetBuffer } from '../services/assets.js';
import crypto from 'node:crypto';

const r = Router();

r.get('/integrations/status', wrap(async (req, res) => res.json(await integrationStatuses())));
r.post('/n8n/test', wrap(async (req, res) => res.json(await notifyN8n('manual.test', { message: 'Creative Identity integration test' }))));
r.post('/qdrant/collection/ensure', wrap(async (req, res) => res.json(await qdrantEnsureCollection())));
r.post('/qdrant/upsert', wrap(async (req, res) => {
  const { id, vector, payload } = req.body || {};
  if (!id || !Array.isArray(vector)) return res.status(400).json({ error: 'id and numeric vector[] are required' });
  res.json(await qdrantUpsert({ id, vector: vector.map(Number), payload: payload || {} }));
}));
r.post('/qdrant/search', wrap(async (req, res) => {
  const { vector, limit, filter } = req.body || {};
  if (!Array.isArray(vector)) return res.status(400).json({ error: 'vector[] is required' });
  res.json(await qdrantSearch({ vector: vector.map(Number), limit, filter }));
}));
r.post('/qdrant/search-text', wrap(async (req, res) => {
  const query = String(req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: 'query is required' });
  const vector = await embedText(query);
if (!vector) {
  return res.status(503).json({
    error: 'Ollama text embedding unavailable. Check Ollama and OLLAMA_EMBEDDING_MODEL.'
  });
}
  res.json(await qdrantSearch({ vector, limit: req.body?.limit, filter: req.body?.filter }));
}));
r.post('/qdrant/index-asset', wrap(async (req, res) => {
  const asset = await Asset.findById(String(req.body?.assetId || ''));
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const vector = await transformerEmbedImage(await readAssetBuffer(asset), asset.filename || 'asset.png');
  const hex = crypto.createHash('sha256').update(String(asset._id)).digest('hex').slice(0, 32).split('');
  hex[12] = '5'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const pointId = `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20,32).join('')}`;
  const result = await qdrantUpsert({ id: pointId, vector, payload: { assetId: String(asset._id), filename: asset.filename || '', prompt: asset.prompt || '', tags: asset.tags || [], category: asset.category || '', kind: asset.kind || '' } });
  res.json({ ok: true, assetId: String(asset._id), pointId, result });
}));

// AUTOMATIC1111 Stable Diffusion WebUI API diagnostics.
r.get('/a1111/status', async (req, res) => {
  const status = await getA1111Status();
  res.status(status.reachable ? 200 : 503).json({
    provider: 'a1111',
    selected: config.generator.provider === 'a1111',
    settings: { steps: config.a1111.steps, cfgScale: config.a1111.cfgScale, sampler: config.a1111.sampler,
      useImg2Img: config.a1111.useImg2Img, denoisingStrength: config.a1111.denoisingStrength },
    ...status,
  });
});

// Connectivity diagnostics only; this endpoint never starts a generation.
r.get('/comfyui/status', async (req, res) => {
  const configured = config.generator.provider === 'comfyui';
  const status = await getComfyUIStatus();
  res.status(status.reachable ? 200 : 503).json({
    provider: 'comfyui',
    selected: configured,
    workflowPathConfigured: Boolean(config.comfyui.workflowPath),
    workflowPath: config.comfyui.workflowPath || null,
    ...status,
  });
});

// InstantID diagnostics only; no generation is started.
r.get('/comfyui/instantid/status', async (req, res) => {
  const status = await getInstantIDStatus();
  res.status(status.reachable ? 200 : 503).json({ provider: 'comfyui', mode: 'instantid', selected: config.generator.provider === 'comfyui' && config.comfyui.identityMode === 'instantid', ...status });
});

// Grounded SAM 2 diagnostics and text-prompt segmentation.
r.get('/grounded-sam-2/status', async (req, res) => {
  const status = await getGroundedSam2Status();
  res.status(status.reachable ? 200 : 503).json({ provider: 'grounded-sam-2', ...status });
});

r.post('/grounded-sam-2/segment', wrap(async (req, res) => {
  const assetId = String(req.body?.assetId || '').trim();
  const prompt = String(req.body?.prompt || '').trim();
  const boxThreshold = Number(req.body?.boxThreshold ?? 0.35);
  const textThreshold = Number(req.body?.textThreshold ?? 0.25);
  if (!assetId) return res.status(400).json({ error: 'assetId is required (upload the source image to Asset Bank first).' });
  if (!prompt) return res.status(400).json({ error: 'A text prompt is required, e.g. person, red handbag, or background.' });
  if (!Number.isFinite(boxThreshold) || boxThreshold < 0 || boxThreshold > 1 || !Number.isFinite(textThreshold) || textThreshold < 0 || textThreshold > 1) {
    return res.status(400).json({ error: 'boxThreshold and textThreshold must be numbers between 0 and 1.' });
  }
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const result = await segmentAssetWithGroundedSam2({ asset, prompt, boxThreshold, textThreshold });
  res.json(result);
}));

export default r;
