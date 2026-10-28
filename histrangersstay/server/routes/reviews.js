const rateLimit = require('express-rate-limit');
const Review = require('../models/Review');
const Settings = require('../models/Settings');
const crud = require('../utils/crud');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { err } = require('../utils/pricing');

// Public:  GET /api/reviews?type=stay|food  -> published reviews only (no type = every type)
//          POST /api/reviews/submit         -> guest writes a review, hidden until the admin approves it
// Admin:   GET /api/reviews/admin/all       -> every review
//          POST/PUT/DELETE                  -> add / edit / remove
const TYPES = ['stay', 'food'];

// Reviews saved before the "type" field existed have no type, so "stay" must match them too
const typeFilter = (type) => {
  if (!TYPES.includes(type)) return {};
  if (type === 'stay') return { $or: [{ type: 'stay' }, { type: { $exists: false } }] };
  return { type };
};

const router = crud(Review, {
  publicFilter: () => ({ published: true }),
  publicQuery: (q) => typeFilter(String(q.type || '')),
  sort: { order: 1, createdAt: -1 },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many reviews from this connection. Please try again later.' },
});

// Public: a guest shares a review. It is saved as hidden; turn on "Show on website" in Admin > Reviews to publish it.
router.post('/submit', submitLimiter, asyncH(async (req, res) => {
  const type = TYPES.includes(req.body.type) ? req.body.type : 'stay';
  const name = String(req.body.name || '').trim();
  const text = String(req.body.text || '').trim();
  if (!name) throw err('Please enter your name');
  if (text.length < 10) throw err('Please write at least a few words about your experience');
  const rating = Math.min(5, Math.max(1, Math.round(Number(req.body.rating) || 5)));
  await Review.create({
    type, name: name.slice(0, 80), text: text.slice(0, 1500), rating,
    country: String(req.body.country || '').trim().slice(0, 80),
    stayedOn: String(req.body.stayedOn || '').trim().slice(0, 40),
    published: false, order: 0,
  });
  res.status(201).json({ message: 'Thank you! Your review will appear after we check it.' });
}));

// Admin: one-click copy of the old "Guest reviews" lines (Site settings) into the database.
// Lines already imported (same name + text) are skipped, so it is safe to click twice.
router.post('/import-from-settings', protect, adminOnly, asyncH(async (req, res) => {
  const s = await Settings.getSingleton();
  const lines = Array.isArray(s.reviews) ? s.reviews : [];
  const existing = await Review.find().select('name text').lean();
  const seen = new Set(existing.map((r) => `${r.name}|${r.text}`));

  const docs = [];
  lines.forEach((line) => {
    const p = String(line).split('|').map((x) => x.trim());
    const rev = p.length >= 3
      ? { name: p[0], country: p[1], text: p.slice(2).join(' | ') }
      : { name: p[0], country: '', text: p[1] || '' };
    if (!rev.name || !rev.text || seen.has(`${rev.name}|${rev.text}`)) return;
    seen.add(`${rev.name}|${rev.text}`);
    docs.push({ ...rev, type: 'stay', rating: 5, published: true, order: docs.length });
  });

  const made = docs.length ? await Review.insertMany(docs) : [];
  res.json({ imported: made.length, skipped: lines.length - made.length });
}));

module.exports = router;
