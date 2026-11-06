// One-time: upload existing local images (server/uploads) to Cloudinary and save the URL on each Asset.
// Run:  npm run backfill-images
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import config from '../src/config.js';
import { connectDB } from '../src/db.js';
import Asset from '../src/models/Asset.js';
import { uploadBuffer, storageEnabled } from '../src/services/storage.js';

if (!storageEnabled()) {
  console.error('CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (ya CLOUDINARY_URL) missing in server/.env');
  process.exit(1);
}
await connectDB();
const assets = await Asset.find({ $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }] });
let ok = 0, missing = 0, failed = 0;
for (const a of assets) {
  const file = path.join(config.uploadDir, a.filename);
  if (!fs.existsSync(file)) { missing++; console.warn('local file missing (re-upload needed):', a.filename); continue; }
  const up = await uploadBuffer(fs.readFileSync(file), a.filename);
  if (!up) { failed++; continue; }
  a.imageUrl = up.url; a.imageFileId = up.fileId; await a.save(); ok++;
}
console.log(`Done. uploaded=${ok} missing-local=${missing} failed=${failed} (of ${assets.length})`);
process.exit(0);
