import config from '../config.js';

/** Optional prompt workflow. Langflow is an orchestration layer, not an image backend. */
export async function runLangflowPrompt(prompt, context = {}) {
  if (!config.langflow.enabled) return prompt;
  const url = `${config.langflow.url.replace(/\/$/, '')}/api/v1/run/${encodeURIComponent(config.langflow.flowId)}`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.langflow.apiKey ? { Authorization: `Bearer ${config.langflow.apiKey}` } : {}) },
    body: JSON.stringify({ input_value: JSON.stringify({ prompt, ...context }), input_type: 'chat', output_type: 'chat', tweaks: config.langflow.tweaks }),
    signal: AbortSignal.timeout(config.langflow.timeoutMs),
  });
  if (!res.ok) throw new Error(`Langflow ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const candidates = [data.output, data.result, data.outputs?.[0]?.outputs?.[0]?.results?.message?.text, data.outputs?.[0]?.outputs?.[0]?.results?.text, data.outputs?.[0]?.outputs?.[0]?.artifacts?.message];
  const value = candidates.find((x) => typeof x === 'string' && x.trim());
  if (!value) throw new Error('Langflow response had no text output; configure the flow to return the final prompt as text');
  try {
    const parsed = JSON.parse(value);
    return String(parsed.prompt || parsed.output || parsed.text || value);
  } catch { return value; }
}
