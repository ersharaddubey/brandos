const Review = require('../models/Review');
const Settings = require('../models/Settings');
const crud = require('../utils/crud');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');

// Public:  GET /api/reviews                 -> published reviews only
// Admin:   GET /api/reviews/admin/all       -> every review
//          POST/PUT/DELETE                  -> add / edit / remove
const router = crud(Review, {
  publicFilter: () => ({ published: true }),
  sort: { order: 1, createdAt: -1 },
});

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
    docs.push({ ...rev, rating: 5, published: true, order: docs.length });
  });

  const made = docs.length ? await Review.insertMany(docs) : [];
  res.json({ imported: made.length, skipped: lines.length - made.length });
}));

module.exports = router;
