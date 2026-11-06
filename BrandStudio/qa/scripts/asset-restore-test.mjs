import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '../../server/node_modules/sharp/lib/index.js';

const BASE = 'http://localhost:5003';
const UPLOAD_DIR = path.resolve('server/uploads-qa');

const log = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
};

async function request(url, options = {}) {
  const response = await fetch(`${BASE}${url}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status} - ${data.error || 'Request failed'}`);
  }

  return data;
}

async function main() {
  if (!process.env.QA_USER || !process.env.QA_PASS) {
    throw new Error('QA_USER and QA_PASS environment variables are required.');
  }

  const health = await request('/api/health');

  if (health.dbName !== 'brandstudio_qa' || health.db !== true) {
    throw new Error(`Unsafe database: ${health.dbName}`);
  }
  log('QA database check', true, health.dbName);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(process.env.QA_USER.includes('@')
        ? { email: process.env.QA_USER }
        : { username: process.env.QA_USER }),
      password: process.env.QA_PASS
    })
  });

  if (!login.token) throw new Error('Login did not return a token.');
  const headers = { Authorization: `Bearer ${login.token}` };
  log('Admin login', true);

  const marker = `QA-RESTORE-${Date.now()}`;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <rect width="128" height="128" fill="#334155"/>
      <text x="8" y="64" font-size="9" fill="white">${marker}</text>
    </svg>`
  );
  const png = await sharp(svg).png().toBuffer();

  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), `${marker}.png`);
  form.append('visibility', 'private');
  form.append('category', 'product');
  form.append('tags', 'qa,restore-test');

  const upload = await request('/api/assets', {
    method: 'POST',
    headers,
    body: form
  });

  const asset = upload.asset;
  if (!asset?._id || !asset?.filename) {
    throw new Error('Upload response did not contain asset ID and filename.');
  }

  log('Synthetic image upload', true, `asset=${asset._id}`);

  const filePath = path.join(UPLOAD_DIR, asset.filename);
  await fs.access(filePath);
  log('Physical image file exists', true, asset.filename);

  const deleted = await request(`/api/assets/${asset._id}`, {
    method: 'DELETE',
    headers
  });

  log('Move asset to Recycle Bin', deleted.ok === true);

  const recycleItems = await request('/api/recycle', { headers });
  const recycleItem = recycleItems.find(
    item => String(item.originalId) === String(asset._id)
  );

  if (!recycleItem) throw new Error('Asset not found in Recycle Bin.');
  log('Recycle Bin entry verified', true, String(recycleItem._id));

  await fs.access(filePath);
  log('File retained after delete', true);

  const restored = await request(`/api/recycle/${recycleItem._id}/restore`, {
    method: 'POST',
    headers
  });

  if (!restored.restored || !restored.item?._id) {
    throw new Error('Restore response was not successful.');
  }

  log('Restore API', true, String(restored.item._id));

  const restoredFile = await fs.access(filePath).then(() => true).catch(() => false);
  if (!restoredFile) throw new Error('Restored asset file is missing.');

  log('Restored physical file', true, asset.filename);

  const remaining = await request('/api/recycle', { headers });
  const stillInBin = remaining.some(
    item => String(item._id) === String(recycleItem._id)
  );

  if (stillInBin) throw new Error('Recycle Bin entry still exists after restore.');
  log('Recycle Bin entry removed after restore', true);

  console.log('\nRESULT: ALL ASSET RESTORE CHECKS PASSED');
  console.log(`Test asset ID: ${asset._id}`);
  console.log(`Test filename: ${asset.filename}`);
}

main().catch(error => {
  console.error('\nQA TEST FAILED:', error.message);
  process.exitCode = 1;
});
