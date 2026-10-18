const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Cloudinary is used when CLOUDINARY_URL (or the three CLOUDINARY_* vars) is set.
// Otherwise images are saved to server/uploads so the site still works in development.
const cloudOn = () => !!(process.env.CLOUDINARY_URL
  || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

let ready = false;
function init() {
  if (ready) return;
  if (process.env.CLOUDINARY_URL) cloudinary.config({ secure: true });
  else cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  ready = true;
}

const root = () => process.env.CLOUDINARY_FOLDER || 'histay';
const uploadDir = path.join(__dirname, '..', 'uploads');

// Save one multer memory file. Returns { url, publicId }.
async function saveImage(file, req, sub = 'general') {
  if (cloudOn()) {
    init();
    const r = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: `${root()}/${sub}`, resource_type: 'image' }, (err, out) => (err ? reject(err) : resolve(out)));
      stream.end(file.buffer);
    });
    // f_auto,q_auto = smallest good-looking format/quality for every visitor
    return { url: r.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'), publicId: r.public_id };
  }
  fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(uploadDir, name), file.buffer);
  return { url: `${req.protocol}://${req.get('host')}/uploads/${name}`, publicId: null };
}

async function removeImage(publicId) {
  if (!publicId || !cloudOn()) return;
  init();
  try { await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true }); } catch (e) { console.error('Cloudinary delete failed:', e.message); }
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    const e = new Error('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'); e.status = 400; cb(e);
  },
});
const wrap = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err) { err.status = err.status || 400; if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Each image must be 10 MB or smaller'; return next(err); }
  next();
});
const single = (field) => wrap(uploader.single(field));
const many = (field, max = 12) => wrap(uploader.array(field, max));

module.exports = { cloudOn, saveImage, removeImage, single, many };
