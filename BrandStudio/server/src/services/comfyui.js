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
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`ComfyUI request failed (${response.status}): ${body || response.statusText}`);
  }
  return response;
}

async function loadWorkflow() {
  if (!config.comfyui.workflowPath) throw new Error('COMFYUI_WORKFLOW_PATH is required when GENERATOR_PROVIDER=comfyui');
  const workflowPath = path.isAbsolute(config.comfyui.workflowPath) ? config.comfyui.workflowPath : path.resolve(serverDir, config.comfyui.workflowPath);
  const raw = await fs.readFile(workflowPath, 'utf8');
  const workflow = JSON.parse(raw);
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) throw new Error('ComfyUI workflow must be an API-format JSON object');
  return workflow;
}

function setNodeInput(workflow, nodeId, inputName, value, label, optional = false) {
  if (!nodeId || !inputName) {
    if (optional) return;
    throw new Error(`Configure the ComfyUI node ID and input for ${label} in server/.env`);
  }
  const node = workflow[String(nodeId)];
  if (!node || !node.inputs || !(inputName in node.inputs)) {
    throw new Error(`ComfyUI workflow mapping for ${label} points to missing node/input: ${nodeId}.${inputName}`);
  }
  node.inputs[inputName] = value;
}

async function uploadReference(base64, index) {
  const bytes = Buffer.from(String(base64).replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
  const form = new FormData();
  const filename = `creative-identity-${crypto.randomUUID()}-${index}.jpg`;
  form.append('image', new Blob([bytes], { type: 'image/jpeg' }), filename);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const response = await request(`${baseUrl()}/upload/image`, { method: 'POST', body: form });
  const data = await response.json();
  if (!data.name) throw new Error('ComfyUI upload/image did not return an image name');
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

async function readOutputImage(history, promptId) {
  const record = history?.[promptId];
  const outputs = record?.outputs || {};
  for (const node of Object.values(outputs)) {
    for (const image of node.images || []) {
      const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type || 'output' });
      const response = await request(`${baseUrl()}/view?${params.toString()}`);
      return Buffer.from(await response.arrayBuffer());
    }
  }
  return null;
}

/** Runs an exported ComfyUI API-format workflow. Node mappings are configured in .env. */
export async function generateWithComfyUI({ prompt, seed, width, height, referencesBase64 = [] }) {
  const workflow = await loadWorkflow();
  const mapping = config.comfyui.mapping;
  setNodeInput(workflow, mapping.prompt.nodeId, mapping.prompt.input, prompt, 'prompt');
  setNodeInput(workflow, mapping.seed.nodeId, mapping.seed.input, seed, 'seed');
  setNodeInput(workflow, mapping.width.nodeId, mapping.width.input, width, 'width');
  setNodeInput(workflow, mapping.height.nodeId, mapping.height.input, height, 'height');
  const hasReference = referencesBase64.length > 0 && Boolean(mapping.reference.nodeId && mapping.reference.input);
  if (hasReference) {
    const imageName = await uploadReference(referencesBase64[0], 0);
    setNodeInput(workflow, mapping.reference.nodeId, mapping.reference.input, imageName, 'reference image');
    if (mapping.ipadapterWeight.nodeId && mapping.ipadapterWeight.input) {
      setNodeInput(workflow, mapping.ipadapterWeight.nodeId, mapping.ipadapterWeight.input, config.comfyui.ipadapterWeight, 'IPAdapter weight');
    }
  } else if (mapping.samplerModel.nodeId && mapping.samplerModel.input && mapping.baseModel.nodeId) {
    // IPAdapter workflow without a supplied identity reference: bypass the adapter node safely.
    setNodeInput(workflow, mapping.samplerModel.nodeId, mapping.samplerModel.input, [String(mapping.baseModel.nodeId), mapping.baseModel.output], 'base model bypass');
  }

  const queued = await (await request(`${baseUrl()}/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: workflow }),
  })).json();
  if (queued.error || !queued.prompt_id) throw new Error(`ComfyUI did not queue workflow: ${JSON.stringify(queued.error || queued)}`);

  const deadline = Date.now() + config.comfyui.jobTimeoutMs;
  while (Date.now() < deadline) {
    await sleep(config.comfyui.pollIntervalMs);
    const historyResponse = await request(`${baseUrl()}/history/${encodeURIComponent(queued.prompt_id)}`);
    const history = await historyResponse.json();
    const result = await readOutputImage(history, queued.prompt_id);
    if (result) return result;
    const entry = history?.[queued.prompt_id];
    if (entry?.status?.status_str === 'error' || entry?.status?.completed === false && entry?.status?.messages?.some((m) => Array.isArray(m) && m[0] === 'execution_error')) {
      throw new Error(`ComfyUI workflow failed: ${JSON.stringify(entry.status.messages || entry.status).slice(0, 700)}`);
    }
  }
  throw new Error(`ComfyUI generation timed out after ${Math.round(config.comfyui.jobTimeoutMs / 60000)} minutes (job ${queued.prompt_id})`);
}

/** Returns a lightweight connectivity/status snapshot without starting a generation. */
export async function getComfyUIStatus() {
  try {
    const [systemResponse, queueResponse] = await Promise.all([
      request(`${baseUrl()}/system_stats`),
      request(`${baseUrl()}/queue`),
    ]);
    const [system, queue] = await Promise.all([systemResponse.json(), queueResponse.json()]);
    return {
      configured: true,
      reachable: true,
      url: baseUrl(),
      ipadapterConfigured: Boolean(config.comfyui.mapping.reference.nodeId && config.comfyui.mapping.ipadapterWeight.nodeId),
      system: {
        comfyuiVersion: system?.system?.comfyui_version || null,
        pythonVersion: system?.system?.python_version || null,
        devices: (system?.devices || []).map((device) => ({
          name: device.name || null,
          type: device.type || null,
          vramTotal: device.vram_total ?? null,
          vramFree: device.vram_free ?? null,
        })),
      },
      queue: {
        running: Array.isArray(queue?.queue_running) ? queue.queue_running.length : null,
        pending: Array.isArray(queue?.queue_pending) ? queue.queue_pending.length : null,
      },
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      url: baseUrl(),
      ipadapterConfigured: Boolean(config.comfyui.mapping.reference.nodeId && config.comfyui.mapping.ipadapterWeight.nodeId),
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}
