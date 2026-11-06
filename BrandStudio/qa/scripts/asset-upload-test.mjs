import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '../../server/node_modules/sharp/lib/index.js';

const BASE = 'http://127.0.0.1:5003';
const UPLOAD_DIR = path.resolve('server/uploads-qa');
const MAX_SIZE = 20 * 1024 * 1024;

let token;
let asset;
let recycleId;
let filePath;

const log = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
};

async function api(url, options = {}) {
  const response = await fetch(`${BASE}${url}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function upload(buffer, filename, mime = 'image/png') {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mime }), filename);

  return api('/api/assets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

async function cleanup() {
  if (!asset?._id) return;

  try {
    const headers = { Authorization: `Bearer ${token}` };

    await api(`/api/assets/${asset._id}`, {
      method: 'DELETE',
      headers
    });

    const { data: items } = await api('/api/recycle', { headers });
    const entry = items.find(
      item => String(item.originalId) === String(asset._id)
    );

    if (entry) {
      await api(`/api/recycle/${entry._id}`, {
        method: 'DELETE',
        headers
      });
    }
  } catch (error) {
    console.error('Cleanup warning:', error.message);
  }
}

async function main() {
  if (!process.env.QA_USER || !process.env.QA_PASS) {
    throw new Error('QA_USER and QA_PASS are required.');
  }

  const health = await api('/api/health');

  if (
    !health.response.ok ||
    health.data.dbName !== 'brandstudio_qa' ||
    health.data.db !== true
  ) {
    throw new Error('Unsafe QA database. Test stopped.');
  }

  log('QA database isolation', true, health.data.dbName);

  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(process.env.QA_USER.includes('@')
        ? { email: process.env.QA_USER }
        : { username: process.env.QA_USER }),
      password: process.env.QA_PASS
    })
  });

  if (!login.response.ok || !login.data.token) {
    throw new Error('QA admin login failed.');
  }

  token = login.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  log('Admin login', true);

  const marker = `QA-UPLOAD-${Date.now()}`;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <rect width="128" height="128" fill="#334155"/>
      <text x="5" y="64" font-size="10" fill="white">${marker}</text>
    </svg>`
  );

  const png = await sharp(svg).png().toBuffer();

  // 1. Valid upload
  const first = await upload(png, `${marker}.png`);

  if (first.response.status !== 201 || !first.data.asset?._id) {
    throw new Error(`Valid upload failed: HTTP ${first.response.status}`);
  }

  asset = first.data.asset;
  filePath = path.join(UPLOAD_DIR, asset.filename);

  log('Valid PNG upload', true, `HTTP ${first.response.status}`);

  await fs.access(filePath);
  log('Physical file created', true);

  // 2. Exact duplicate
  const second = await upload(png, `${marker}-duplicate.png`);

  if (
    second.response.status !== 200 ||
    second.data.duplicate !== true ||
    String(second.data.asset?._id) !== String(asset._id)
  ) {
    throw new Error('Exact duplicate detection failed.');
  }

  log('Exact duplicate detection', true, 'Same asset ID reused');

  // 3. Invalid image bytes with image MIME
  const invalid = await upload(
    Buffer.from('not-a-real-image'),
    `${marker}-invalid.png`,
    'image/png'
  );

  if (invalid.response.ok) {
    throw new Error('Invalid image bytes were unexpectedly accepted.');
  }

  log('Invalid image rejected', true, `HTTP ${invalid.response.status}`);

  // 4. Non-image MIME
  const nonImage = await upload(
    Buffer.from('QA plain text file'),
    `${marker}.txt`,
    'text/plain'
  );

  if (nonImage.response.ok) {
    throw new Error('Non-image MIME type was unexpectedly accepted.');
  }

  log('Non-image MIME rejected', true, `HTTP ${nonImage.response.status}`);

  // 5. Oversized upload
  const oversized = await upload(
    Buffer.alloc(MAX_SIZE + 1),
    `${marker}-oversized.png`,
    'image/png'
  );

  if (oversized.response.ok) {
    throw new Error('File larger than 20 MB was unexpectedly accepted.');
  }

  log('Over 20 MB upload rejected', true, `HTTP ${oversized.response.status}`);

  // 6. Soft delete
  const deleted = await api(`/api/assets/${asset._id}`, {
    method: 'DELETE',
    headers
  });

  if (!deleted.response.ok || deleted.data.ok !== true) {
    throw new Error('Soft delete failed.');
  }

  log('Soft delete', true);

  const bin = await api('/api/recycle', { headers });
  const entry = bin.data.find(
    item => String(item.originalId) === String(asset._id)
  );

  if (!entry) throw new Error('Recycle Bin entry not found.');

  recycleId = entry._id;
  log('Recycle Bin entry created', true);

  await fs.access(filePath);
  log('File retained after soft delete', true);

  // 7. Permanent delete only this test entry
  const permanent = await api(`/api/recycle/${recycleId}`, {
    method: 'DELETE',
    headers
  });

  if (!permanent.response.ok || permanent.data.ok !== true) {
    throw new Error('Permanent delete failed.');
  }

  recycleId = null;
  log('Permanent delete of test entry', true);

  const exists = await fs.access(filePath).then(
    () => true,
    () => false
  );

  if (exists) throw new Error('Physical file still exists after permanent delete.');

  log('Physical file cleanup', true);

  const remaining = await api('/api/recycle', { headers });

  if (remaining.data.some(item => String(item._id) === String(entry._id))) {
    throw new Error('Deleted Recycle Bin entry still exists.');
  }

  asset = null;
  log('Recycle Bin entry removed', true);

  console.log('\nRESULT: ALL ASSET UPLOAD CHECKS PASSED');
}

main().catch(async error => {
  console.error('\nQA TEST FAILED:', error.message);
  await cleanup();
  process.exitCode = 1;
});
