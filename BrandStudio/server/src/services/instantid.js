import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import config from '../config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = () => config.comfyui.url.replace(/\/$/, '');

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(config.comfyui.requestTimeoutMs) });
  if (!response.ok) throw new Error(`ComfyUI InstantID request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response;
}

async function loadWorkflow() {
  const relative = config.instantid.workflowPath;
  if (!relative) throw new Error('COMFYUI_INSTANTID_WORKFLOW_PATH is required when COMFYUI_IDENTITY_MODE=instantid');
  const workflowPath = path.isAbsolute(relative) ? relative : path.resolve(serverDir, relative);
  const workflow = JSON.parse(await fs.readFile(workflowPath, 'utf8'));
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) throw new Error('InstantID workflow must be a ComfyUI API-format JSON object');
  return workflow;
}

function setInput(workflow, mapping, value, label, optional = false) {
  if (!mapping?.nodeId || !mapping?.input) {
    if (optional) return;
    throw new Error(`Configure COMFYUI_INSTANTID_${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_NODE and _INPUT in server/.env`);
  }
  const node = workflow[String(mapping.nodeId)];
  if (!node?.inputs || !(mapping.input in node.inputs)) throw new Error(`InstantID workflow mapping for ${label} points to missing node/input ${mapping.nodeId}.${mapping.input}`);
  node.inputs[mapping.input] = value;
}

async function uploadReference(base64) {
  const cleaned = String(base64).replace(/^data:image\/[^;]+;base64,/, '');
  const bytes = Buffer.from(cleaned, 'base64');
  if (!bytes.length) throw new Error('Identity reference image is empty or invalid base64');
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), `creative-identity-instantid-${crypto.randomUUID()}.png`);
  form.append('type', 'input'); form.append('overwrite', 'true');
  const data = await (await request(`${baseUrl()}/upload/image`, { method: 'POST', body: form })).json();
  if (!data.name) throw new Error('ComfyUI upload/image did not return an image name');
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

async function readOutput(history, promptId) {
  for (const node of Object.values(history?.[promptId]?.outputs || {})) {
    for (const img of node.images || []) {
      const qs = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder || '', type: img.type || 'output' });
      return Buffer.from(await (await request(`${baseUrl()}/view?${qs}`)).arrayBuffer());
    }
  }
  return null;
}

/** Runs a user-configured ComfyUI InstantID API workflow. The workflow must contain ApplyInstantID and a compatible face-analysis/controlnet setup. */
export async function generateWithInstantID({ prompt, seed, width, height, referencesBase64 = [] }) {
  if (!referencesBase64[0]) throw new Error('InstantID mode requires a locked identity reference image. Choose a locked identity with a reference asset or use COMFYUI_IDENTITY_MODE=ipadapter/basic.');
  const wf = await loadWorkflow();
  const m = config.instantid.mapping;
  setInput(wf, m.prompt, prompt, 'prompt');
  setInput(wf, m.seed, seed, 'seed');
  setInput(wf, m.width, width, 'width');
  setInput(wf, m.height, height, 'height');
  setInput(wf, m.reference, await uploadReference(referencesBase64[0]), 'reference image');
  setInput(wf, m.ipWeight, config.instantid.ipWeight, 'identity weight', true);
  setInput(wf, m.controlStrength, config.instantid.controlStrength, 'control strength', true);
  const queued = await (await request(`${baseUrl()}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: wf }) })).json();
  if (queued.error || !queued.prompt_id) throw new Error(`ComfyUI did not queue InstantID workflow: ${JSON.stringify(queued.error || queued)}`);
  const deadline = Date.now() + config.comfyui.jobTimeoutMs;
  while (Date.now() < deadline) {
    await sleep(config.comfyui.pollIntervalMs);
    const history = await (await request(`${baseUrl()}/history/${encodeURIComponent(queued.prompt_id)}`)).json();
    const image = await readOutput(history, queued.prompt_id);
    if (image) return image;
    const status = history?.[queued.prompt_id]?.status;
    if (status?.status_str === 'error' || status?.messages?.some((x) => Array.isArray(x) && x[0] === 'execution_error')) {
      throw new Error(`ComfyUI InstantID workflow failed: ${JSON.stringify(status.messages || status).slice(0, 800)}`);
    }
  }
  throw new Error(`ComfyUI InstantID generation timed out after ${Math.round(config.comfyui.jobTimeoutMs / 60000)} minutes (job ${queued.prompt_id})`);
}

export async function getInstantIDStatus() {
  try {
    const response = await request(`${baseUrl()}/system_stats`);
    const system = await response.json();
    return { reachable: true, url: baseUrl(), workflowPathConfigured: Boolean(config.instantid.workflowPath), identityMode: config.comfyui.identityMode, devices: (system.devices || []).map((d) => ({ name: d.name || null, type: d.type || null })) };
  } catch (error) {
    return { reachable: false, url: baseUrl(), workflowPathConfigured: Boolean(config.instantid.workflowPath), identityMode: config.comfyui.identityMode, error: error.message };
  }
}
