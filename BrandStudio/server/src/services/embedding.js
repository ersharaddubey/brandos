import config from '../config.js';

/** Creates a real Ollama embedding when the configured model supports /api/embed.
 * If unavailable, returns null so callers can use a deterministic local lexical fallback. */
export async function embedText(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  try {
    const res = await fetch(`${config.ollama.url.replace(/\/$/, '')}/api/embed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.ollama.embeddingModel || config.ollama.textModel, input: value }),
      signal: AbortSignal.timeout(15002),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vec = data.embeddings?.[0] || data.embedding;
    return Array.isArray(vec) && vec.length ? vec.map(Number) : null;
  } catch { return null; }
}

export function lexicalVector(text) {
  const tokens = String(text || '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  const out = new Map();
  for (const token of tokens) out.set(token, (out.get(token) || 0) + 1);
  return [...out.entries()].map(([token, count]) => [token, count / Math.sqrt(tokens.length || 1)]);
}
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
export function lexicalScore(query, document) {
  const q = new Set((String(query || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []));
  const d = new Set((String(document || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []));
  if (!q.size || !d.size) return 0;
  let overlap = 0; for (const t of q) if (d.has(t)) overlap++;
  return overlap / Math.sqrt(q.size * d.size);
}
