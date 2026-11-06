// `npm run doctor` (server/ me) — local testing se pehle sab kuch check karta hai.
import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config.js';

const ok = (m) => console.log(`  ✅ ${m}`);
const bad = (m) => console.log(`  ❌ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
let problems = 0;
const fail = (m) => { problems++; bad(m); };

console.log('\nBrandStudio doctor\n');

console.log('Node');
Number(process.versions.node.split('.')[0]) >= 20 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} — Node 20+ chahiye`);

console.log('\nMongoDB');
try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 });
  ok(`connected (${mongoose.connection.name}) @ ${config.mongoUri.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.disconnect();
} catch (e) { fail(`connect nahi hua: ${e.message}  → local MongoDB start karo (brew services start mongodb-community)`); }

console.log('\nOllama');
try {
  const r = await fetch(`${config.ollama.url}/api/tags`, { signal: AbortSignal.timeout(4000) });
  const tags = (await r.json()).models?.map((m) => m.name) || [];
  ok(`running @ ${config.ollama.url} (${tags.length} models)`);
  const has = (name) => tags.some((t) => t === name || t.startsWith(name + ':') || t.split(':')[0] === name.split(':')[0] && (!name.includes(':') || t === name));
  for (const [label, model, must] of [['text', config.ollama.textModel, true], ['vision', config.ollama.visionModel, true], ['embedding', config.ollama.embeddingModel, false]]) {
    if (has(model)) ok(`${label} model "${model}" installed`);
    else (must ? fail : warn)(`${label} model "${model}" nahi mila → ollama pull ${model}${must ? '' : '   (optional; bina iske search lexical fallback par chalega)'}`);
  }
} catch (e) { fail(`Ollama reachable nahi (${config.ollama.url}): ${e.message}  → ollama serve`); }

console.log('\nGeneration');
const prov = config.generator.provider;
console.log(`  provider = ${prov}`);
if (prov === 'mock') warn('mock = sirf placeholder images. Real images ke liye GENERATOR_PROVIDER=pollinations ya api');
if (prov === 'api') {
  const names = { FAL: ['FAL_KEYS', 'FAL_KEY'], REPLICATE: ['REPLICATE_TOKENS', 'REPLICATE_API_TOKEN'], STABILITY: ['STABILITY_KEYS', 'STABILITY_API_KEY'], IDEOGRAM: ['IDEOGRAM_KEYS', 'IDEOGRAM_API_KEY'], OPENAI: ['OPENAI_KEYS', 'OPENAI_API_KEY'], TOGETHER: ['TOGETHER_KEYS', 'TOGETHER_API_KEY'] };
  const have = Object.entries(names).filter(([, vars]) => vars.some((v) => process.env[v]));
  have.length ? ok(`API keys mili: ${have.map(([n]) => n).join(', ')}`) : fail('provider=api par koi API key set nahi');
}
if (prov === 'comfyui') { try { await fetch(config.comfyui.url, { signal: AbortSignal.timeout(3000) }); ok('ComfyUI reachable'); } catch { fail(`ComfyUI reachable nahi (${config.comfyui.url})`); } }
if (prov === 'a1111') { try { await fetch(config.a1111.url, { signal: AbortSignal.timeout(3000) }); ok('A1111 reachable'); } catch { fail(`A1111 reachable nahi (${config.a1111.url})`); } }
process.env.FAL_KEY || process.env.FAL_KEYS ? ok(`video ready (fal model ${config.video.falModel})`) : warn('FAL_KEY nahi → "Generate video file" button kaam nahi karega (video prompt phir bhi banega)');

console.log('\nStorage / Security');
(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) ? ok('Cloudinary configured') : ok('Cloudinary off → images local server/uploads me (local testing ke liye theek)');
!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'brandstudio@Studio#2026' ? fail('ADMIN_PASSWORD default/khali hai') : ok('custom ADMIN_PASSWORD set');
process.env.AUTH_SECRET ? ok('AUTH_SECRET set') : warn('AUTH_SECRET khali');

console.log(problems ? `\n${problems} problem(s) upar dekho.\n` : '\nSab theek hai ✅\n');
process.exit(problems ? 1 : 0);
