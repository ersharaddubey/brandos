import config from '../config.js';

async function probe(name, url, path = '/', headers = {}, timeoutMs = 3500) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}${path}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    return { name, url, reachable: response.ok, status: response.status };
  } catch (error) {
    return { name, url, reachable: false, error: error.name === 'TimeoutError' ? 'timeout' : error.message };
  }
}
const qHeaders = () => config.qdrant.apiKey ? { 'api-key': config.qdrant.apiKey } : {};
export async function integrationStatuses() {
  const [invokeai, langflow, n8n, qdrant, openWebUI, transformers] = await Promise.all([
    probe('invokeai', config.invokeai.url, '/docs', config.invokeai.apiKey ? { Authorization: `Bearer ${config.invokeai.apiKey}` } : {}),
    probe('langflow', config.langflow.url, '/health'),
    config.n8n.webhookUrl ? (() => { try { const u = new URL(config.n8n.webhookUrl); return probe('n8n-webhook', u.origin, '/healthz'); } catch { return Promise.resolve({ name: 'n8n-webhook', reachable: false, configured: true, error: 'N8N_WEBHOOK_URL is not a valid URL' }); } })() : Promise.resolve({ name: 'n8n-webhook', reachable: false, configured: false, error: 'N8N_WEBHOOK_URL not configured' }),
    probe('qdrant', config.qdrant.url, '/collections', qHeaders()),
    probe('open-webui', config.openWebUI.url, '/api/health'),
    probe('transformers', config.transformers.url, '/health'),
  ]);
  return { invokeai: { ...invokeai, configuredPath: config.invokeai.generatePath }, langflow: { ...langflow, enabled: config.langflow.enabled, flowConfigured: Boolean(config.langflow.flowId) }, n8n, qdrant: { ...qdrant, collection: config.qdrant.collection, vectorSize: config.qdrant.vectorSize }, openWebUI, transformers };
}

export async function notifyN8n(event, payload = {}) {
  if (!config.n8n.webhookUrl) return { skipped: true, reason: 'N8N_WEBHOOK_URL not configured' };
  const headers = { 'content-type': 'application/json' };
  if (config.n8n.webhookSecret) headers['x-creative-identity-secret'] = config.n8n.webhookSecret;
  const response = await fetch(config.n8n.webhookUrl, { method: 'POST', headers, body: JSON.stringify({ source: 'creative-identity-platform', event, occurredAt: new Date().toISOString(), payload }), signal: AbortSignal.timeout(config.n8n.timeoutMs) });
  if (!response.ok) throw new Error(`n8n webhook returned HTTP ${response.status}`);
  return { delivered: true, status: response.status };
}

export async function qdrantEnsureCollection() {
  const base = config.qdrant.url.replace(/\/$/, '');
  const headers = { ...qHeaders(), 'content-type': 'application/json' };
  const check = await fetch(`${base}/collections/${encodeURIComponent(config.qdrant.collection)}`, { headers, signal: AbortSignal.timeout(5002) });
  if (check.ok) return { exists: true, collection: config.qdrant.collection };
  if (check.status !== 404) throw new Error(`Qdrant collection check failed (${check.status})`);
  const create = await fetch(`${base}/collections/${encodeURIComponent(config.qdrant.collection)}`, { method: 'PUT', headers, body: JSON.stringify({ vectors: { size: config.qdrant.vectorSize, distance: 'Cosine' } }), signal: AbortSignal.timeout(10000) });
  if (!create.ok) throw new Error(`Qdrant collection create failed (${create.status}): ${(await create.text()).slice(0, 300)}`);
  return { exists: false, created: true, collection: config.qdrant.collection, vectorSize: config.qdrant.vectorSize };
}
export async function qdrantUpsert({ id, vector, payload = {} }) {
  if (!Array.isArray(vector) || vector.length !== config.qdrant.vectorSize) throw new Error(`Vector must contain exactly ${config.qdrant.vectorSize} numbers`);
  await qdrantEnsureCollection();
  const url = `${config.qdrant.url.replace(/\/$/, '')}/collections/${encodeURIComponent(config.qdrant.collection)}/points?wait=true`;
  const response = await fetch(url, { method: 'PUT', headers: { ...qHeaders(), 'content-type': 'application/json' }, body: JSON.stringify({ points: [{ id, vector, payload }] }), signal: AbortSignal.timeout(15002) });
  if (!response.ok) throw new Error(`Qdrant upsert failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return response.json();
}
export async function qdrantSearch({ vector, limit = 10, filter }) {
  if (!Array.isArray(vector) || vector.length !== config.qdrant.vectorSize) throw new Error(`Vector must contain exactly ${config.qdrant.vectorSize} numbers`);
  const response = await fetch(`${config.qdrant.url.replace(/\/$/, '')}/collections/${encodeURIComponent(config.qdrant.collection)}/points/search`, { method: 'POST', headers: { ...qHeaders(), 'content-type': 'application/json' }, body: JSON.stringify({ vector, limit: Math.min(100, Math.max(1, Number(limit) || 10)), with_payload: true, ...(filter ? { filter } : {}) }), signal: AbortSignal.timeout(15002) });
  if (!response.ok) throw new Error(`Qdrant search failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return response.json();
}


export async function transformerEmbedText(text) {
  const response = await fetch(`${config.transformers.url.replace(/\/$/, '')}/embed/text`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(config.transformers.timeoutMs) });
  if (!response.ok) throw new Error(`Transformers text embedding failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  return data.vector;
}
export async function transformerEmbedImage(buffer, filename = 'asset.png') {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  const response = await fetch(`${config.transformers.url.replace(/\/$/, '')}/embed/image`, { method: 'POST', body: form, signal: AbortSignal.timeout(config.transformers.timeoutMs) });
  if (!response.ok) throw new Error(`Transformers image embedding failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  return data.vector;
}
