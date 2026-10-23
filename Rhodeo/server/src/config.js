import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/identity_platform',
  uploadDir: path.resolve(__dirname, '../uploads'),
  similarThreshold: Number(process.env.SIMILAR_THRESHOLD || 6),
  ollama: {
    url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    textModel: process.env.OLLAMA_TEXT_MODEL || 'qwen3:8b',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || process.env.OLLAMA_TEXT_MODEL || 'qwen3:8b',
    visionModel: process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:8b-instruct',
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || '30m', // model baar-baar load na ho
    analyzeMaxPx: Number(process.env.ANALYZE_MAX_PX || 768), // analyse se pehle image resize (chhoti = tez)
  },
  faceCheckUrl: process.env.FACE_CHECK_URL || '', // optional: flux-server /face-similarity
  generator: {
    provider: process.env.GENERATOR_PROVIDER || 'mock',
    url: process.env.GENERATOR_URL || 'http://127.0.0.1:8000/generate',
    width: Number(process.env.GEN_WIDTH || 1024),
    height: Number(process.env.GEN_HEIGHT || 1024),
  },
  a1111: {
    url: process.env.A1111_URL || 'http://127.0.0.1:7860',
    steps: Number(process.env.A1111_STEPS || 28),
    cfgScale: Number(process.env.A1111_CFG_SCALE || 7),
    sampler: process.env.A1111_SAMPLER || 'DPM++ 2M Karras',
    negativePrompt: process.env.A1111_NEGATIVE_PROMPT || '',
    useImg2Img: process.env.A1111_USE_IMG2IMG === 'true',
    denoisingStrength: Number(process.env.A1111_DENOISING_STRENGTH || 0.55),
  },
  invokeai: {
    url: process.env.INVOKEAI_URL || 'http://127.0.0.1:9090',
    apiKey: process.env.INVOKEAI_API_KEY || '',
    generatePath: process.env.INVOKEAI_GENERATE_PATH || '/api/v1/creative-identity/generate',
    timeoutMs: Number(process.env.INVOKEAI_TIMEOUT_MS || 900000),
  },
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
    webhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
    timeoutMs: Number(process.env.N8N_TIMEOUT_MS || 10000),
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
    collection: process.env.QDRANT_COLLECTION || 'creative_identity_assets',
    vectorSize: Number(process.env.QDRANT_VECTOR_SIZE || 768),
  },
  openWebUI: { url: process.env.OPEN_WEBUI_URL || 'http://127.0.0.1:3000' },
  transformers: {
    url: process.env.TRANSFORMERS_URL || 'http://127.0.0.1:8092',
    timeoutMs: Number(process.env.TRANSFORMERS_TIMEOUT_MS || 120000),
  },
  queue: { concurrency: Math.max(1, Number(process.env.GENERATION_CONCURRENCY || 1)), maxRetries: Math.max(0, Number(process.env.GENERATION_MAX_RETRIES || 1)), pollMs: Math.max(500, Number(process.env.GENERATION_QUEUE_POLL_MS || 1500)) },
  langflow: {
    enabled: process.env.LANGFLOW_ENABLED === 'true',
    url: process.env.LANGFLOW_URL || 'http://127.0.0.1:7860',
    flowId: process.env.LANGFLOW_FLOW_ID || '',
    apiKey: process.env.LANGFLOW_API_KEY || '',
    timeoutMs: Number(process.env.LANGFLOW_TIMEOUT_MS || 120000),
    tweaks: process.env.LANGFLOW_TWEAKS_JSON ? JSON.parse(process.env.LANGFLOW_TWEAKS_JSON) : {},
  },
  comfyui: {
    url: process.env.COMFYUI_URL || 'http://127.0.0.1:8188',
    identityMode: process.env.COMFYUI_IDENTITY_MODE || 'basic', // basic | ipadapter | instantid
    workflowPath: process.env.COMFYUI_WORKFLOW_PATH || '',
    requestTimeoutMs: Number(process.env.COMFYUI_REQUEST_TIMEOUT_MS || 30000),
    jobTimeoutMs: Number(process.env.COMFYUI_JOB_TIMEOUT_MS || 900000),
    pollIntervalMs: Number(process.env.COMFYUI_POLL_INTERVAL_MS || 1500),
    ipadapterWeight: Math.min(2, Math.max(0, Number(process.env.COMFYUI_IPADAPTER_WEIGHT || 0.75))),
    mapping: {
      prompt: { nodeId: process.env.COMFYUI_PROMPT_NODE || '2', input: process.env.COMFYUI_PROMPT_INPUT || 'text' },
      seed: { nodeId: process.env.COMFYUI_SEED_NODE || '4', input: process.env.COMFYUI_SEED_INPUT || 'seed' },
      width: { nodeId: process.env.COMFYUI_WIDTH_NODE || '5', input: process.env.COMFYUI_WIDTH_INPUT || 'width' },
      height: { nodeId: process.env.COMFYUI_HEIGHT_NODE || '5', input: process.env.COMFYUI_HEIGHT_INPUT || 'height' },
      reference: { nodeId: process.env.COMFYUI_REFERENCE_NODE || '', input: process.env.COMFYUI_REFERENCE_INPUT || 'image' },
      ipadapterWeight: { nodeId: process.env.COMFYUI_IPADAPTER_WEIGHT_NODE || '', input: process.env.COMFYUI_IPADAPTER_WEIGHT_INPUT || 'weight' },
      samplerModel: { nodeId: process.env.COMFYUI_SAMPLER_MODEL_NODE || '', input: process.env.COMFYUI_SAMPLER_MODEL_INPUT || 'model' },
      baseModel: { nodeId: process.env.COMFYUI_BASE_MODEL_NODE || '', output: Number(process.env.COMFYUI_BASE_MODEL_OUTPUT || 0) },
    },
  },
  groundedSam2: {
    enabled: process.env.GROUNDED_SAM2_ENABLED === 'true',
    url: process.env.GROUNDED_SAM2_URL || 'http://127.0.0.1:8091',
    segmentPath: process.env.GROUNDED_SAM2_SEGMENT_PATH || '/segment',
    healthPath: process.env.GROUNDED_SAM2_HEALTH_PATH || '/health',
    timeoutMs: Math.max(1000, Number(process.env.GROUNDED_SAM2_TIMEOUT_MS || 120000)),
  },
  instantid: {
    workflowPath: process.env.COMFYUI_INSTANTID_WORKFLOW_PATH || './comfyui-instantid-workflow-api.example.json',
    ipWeight: Math.min(2, Math.max(0, Number(process.env.COMFYUI_INSTANTID_WEIGHT || 0.8))),
    controlStrength: Math.min(2, Math.max(0, Number(process.env.COMFYUI_INSTANTID_CONTROL_STRENGTH || 0.8))),
    mapping: {
      prompt: { nodeId: process.env.COMFYUI_INSTANTID_PROMPT_NODE || '2', input: process.env.COMFYUI_INSTANTID_PROMPT_INPUT || 'text' },
      seed: { nodeId: process.env.COMFYUI_INSTANTID_SEED_NODE || '4', input: process.env.COMFYUI_INSTANTID_SEED_INPUT || 'seed' },
      width: { nodeId: process.env.COMFYUI_INSTANTID_WIDTH_NODE || '5', input: process.env.COMFYUI_INSTANTID_WIDTH_INPUT || 'width' },
      height: { nodeId: process.env.COMFYUI_INSTANTID_HEIGHT_NODE || '5', input: process.env.COMFYUI_INSTANTID_HEIGHT_INPUT || 'height' },
      reference: { nodeId: process.env.COMFYUI_INSTANTID_REFERENCE_NODE || '11', input: process.env.COMFYUI_INSTANTID_REFERENCE_INPUT || 'image' },
      ipWeight: { nodeId: process.env.COMFYUI_INSTANTID_WEIGHT_NODE || '12', input: process.env.COMFYUI_INSTANTID_WEIGHT_INPUT || 'weight' },
      controlStrength: { nodeId: process.env.COMFYUI_INSTANTID_CONTROL_NODE || '', input: process.env.COMFYUI_INSTANTID_CONTROL_INPUT || 'cn_strength' },
    },
  },
};
