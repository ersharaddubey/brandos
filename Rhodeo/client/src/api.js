async function j(url, opts = {}) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
}
const send = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const post = (url) => j(url, { method: 'POST' });

export const api = {
  health: () => j('/api/health'),
  stats: () => j('/api/stats'),
  identities: {
    list: (q = '') => j('/api/identities' + q),
    get: (id) => j(`/api/identities/${id}`),
    keys: () => j('/api/identities/meta/keys'),
    schema: () => j('/api/identities/meta/schema'),
    create: (fd) => j('/api/identities', { method: 'POST', body: fd }),
    /** One composite image → up to 4 separate identity layers (product/character/environment/brand) */
    extractAll: (fd) => j('/api/identities/extract-all', { method: 'POST', body: fd }),
    addReference: (id, fd) => j(`/api/identities/${id}/reference`, { method: 'POST', body: fd }),
    update: (id, b) => j(`/api/identities/${id}`, send('PUT', b)),
    lock: (id) => post(`/api/identities/${id}/lock`),
    unlock: (id) => post(`/api/identities/${id}/unlock`),
    reanalyze: (id) => post(`/api/identities/${id}/reanalyze`),
    remove: (id) => j(`/api/identities/${id}`, { method: 'DELETE' }),
  },
  prompts: {
    list: (qs = '') => j('/api/prompts' + qs),
    create: (b) => j('/api/prompts', send('POST', b)),
    addVersion: (id, b) => j(`/api/prompts/${id}/versions`, send('POST', b)),
    setCurrent: (id, v) => post(`/api/prompts/${id}/current/${v}`),
    setVisibility: (id, visibility) => j(`/api/prompts/${id}/visibility`, send('PATCH', { visibility })),
    remove: (id) => j(`/api/prompts/${id}`, { method: 'DELETE' }),
  },
  assets: {
    list: (qs = '') => j('/api/assets' + qs),
    search: (qs = '') => j('/api/assets/search' + qs),
    reindex: (limit = 100) => j('/api/assets/reindex', send('POST', { limit })),
    upload: (fd) => j('/api/assets', { method: 'POST', body: fd }),
    duplicates: (qs = '') => j('/api/assets/duplicates' + qs),
    setVisibility: (id, visibility) => j(`/api/assets/${id}/visibility`, send('PATCH', { visibility })),
    setCategory: (id, category) => j(`/api/assets/${id}/category`, send('PATCH', { category })),
    inpaint: (id, body) => j(`/api/assets/${id}/inpaint`, send('POST', body)),
    remove: (id) => j(`/api/assets/${id}`, { method: 'DELETE' }),
  },
  providers: {
    integrationsStatus: () => j('/api/providers/integrations/status'),
    testN8n: () => post('/api/providers/n8n/test'),
    ensureQdrant: () => post('/api/providers/qdrant/collection/ensure'),
    qdrantSearchText: (query, limit = 10) => j('/api/providers/qdrant/search-text', send('POST', { query, limit })),
    qdrantIndexAsset: (assetId) => j('/api/providers/qdrant/index-asset', send('POST', { assetId })),
    a1111Status: () => j('/api/providers/a1111/status'),
    groundedSam2Status: () => j('/api/providers/grounded-sam-2/status'),
    segmentWithGroundedSam2: (body) => j('/api/providers/grounded-sam-2/segment', send('POST', body)),
  },
  compile: (b) => j('/api/compile', send('POST', b)),
  check: (fd) => j('/api/compile/check', { method: 'POST', body: fd }),
  imageToPrompt: (fd) => j('/api/compile/image-to-prompt', { method: 'POST', body: fd }),
  generateImage: (b) => j('/api/compile/generate-image', send('POST', b)),
  generations: {
    list: () => j('/api/generations'),
    get: (id) => j(`/api/generations/${id}`),
    create: (b) => j('/api/generations', send('POST', b)),
    cancel: (id) => post(`/api/generations/${id}/cancel`),
    retry: (id) => post(`/api/generations/${id}/retry`),
  },
  groups: {
    list: (qs = '') => j('/api/groups' + qs),
    create: (b) => j('/api/groups', send('POST', b)),
    update: (id, b) => j(`/api/groups/${id}`, send('PATCH', b)),
    addAsset: (id, assetId) => j(`/api/groups/${id}/assets`, send('POST', { assetId })),
    remove: (id, body = {}) => j(`/api/groups/${id}`, send('DELETE', body)),
  },
  recycle: {
    list: () => j('/api/recycle'),
    restore: (id) => j(`/api/recycle/${id}/restore`, { method: 'POST' }),
    remove: (id) => j(`/api/recycle/${id}`, { method: 'DELETE' }),
    empty: () => j('/api/recycle', { method: 'DELETE' }),
  },
};
