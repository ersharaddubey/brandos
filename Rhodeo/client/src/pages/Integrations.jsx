import { useEffect, useState } from 'react';
import { api } from '../api.js';

const labels = {
  invokeai: ['InvokeAI', 'Canvas workflows and image editing. API route must match installed InvokeAI version.'],
  langflow: ['Langflow', 'Optional visual prompt preparation and AI orchestration.'],
  n8n: ['n8n', 'Webhook notifications after a generation finishes or fails.'],
  qdrant: ['Qdrant', 'Vector database for semantic asset search.'],
  openWebUI: ['Open WebUI', 'Separate local interface for Ollama models.'],
  transformers: ['Hugging Face Transformers', 'CLIP text/image embeddings service.'],
};
export default function Integrations() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const load = () => api.providers.integrationsStatus().then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function testN8n() { setBusy(true); setMessage(''); try { const r = await api.providers.testN8n(); setMessage(r.delivered ? 'n8n webhook delivered.' : r.reason); } catch(e) { setMessage(e.message); } finally { setBusy(false); } }
  async function setupQdrant() { setBusy(true); setMessage(''); try { const r = await api.providers.ensureQdrant(); setMessage(r.created ? 'Qdrant collection created.' : 'Qdrant collection already exists.'); } catch(e) { setMessage(e.message); } finally { setBusy(false); } }
  return <section className="page"><div className="page-head"><div><p className="eyebrow">SYSTEM</p><h1>Integrations</h1><p className="muted">Check connections for the optional AI tools. A reachable service does not guarantee a compatible workflow or model.</p></div><button className="button" onClick={load}>Refresh status</button></div>
    {error && <p className="error">Backend status unavailable: {error}</p>}
    <div className="integration-grid">{Object.entries(labels).map(([key, info]) => { const item = data?.[key]; return <article className="integration-card" key={key}><div className="integration-top"><h3>{info[0]}</h3><span className={'integration-pill '+(item?.reachable ? 'is-up' : 'is-down')}>{item?.reachable ? 'Reachable' : item?.configured === false ? 'Not configured' : 'Offline'}</span></div><p>{info[1]}</p><small>{item?.url || (key === 'n8n' ? 'Set N8N_WEBHOOK_URL' : 'Waiting for status')}</small>{item?.error && <small className="error">{item.error}</small>}{item?.status && <small>HTTP {item.status}</small>}{key === 'qdrant' && <small>Collection: {item?.collection || 'creative_identity_assets'} · {item?.vectorSize || 768} dimensions</small>}{key === 'langflow' && <small>Enabled: {String(item?.enabled)} · Flow ID set: {String(item?.flowConfigured)}</small>}</article>; })}</div>
    <div className="integration-actions"><button className="button" disabled={busy} onClick={setupQdrant}>Ensure Qdrant collection</button><button className="button secondary" disabled={busy} onClick={testN8n}>Send n8n test webhook</button></div>{message && <p className="notice">{message}</p>}
    <div className="panel"><h2>Setup notes</h2><ul><li>Image generators (ComfyUI, AUTOMATIC1111, InvokeAI) are alternatives; select one provider at a time.</li><li>Langflow is optional prompt orchestration; configure a flow that returns the final prompt as text.</li><li>n8n needs a Webhook trigger URL. Keep it private; set the optional shared secret in both systems.</li><li>Qdrant collection dimension must match the embedding model. The included Transformers sidecar uses CLIP ViT-L/14 with 768 dimensions.</li><li>Open WebUI is a supporting interface for local Ollama; it is not embedded inside this app.</li></ul></div>
  </section>;
}
