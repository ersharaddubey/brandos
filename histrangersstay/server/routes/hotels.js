const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');
const crud = require('../utils/crud');
const asyncH = require('../utils/asyncH');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const router = crud(Hotel, {
  sort: { featured: -1, createdAt: -1 },
  publicFilter: () => ({ active: true }),
  // Single property: a second hotel cannot be added and the only one cannot be deleted
  canCreate: async () => (await Hotel.countDocuments()) === 0,
  canDelete: async () => false,
  publicQuery: (q) => {
    const f = {};
    if (q.city) f.city = new RegExp(`^${esc(q.city)}$`, 'i');
    if (q.type) f.type = q.type;
    if (q.brand) f.brand = q.brand;
    if (q.featured === 'true') f.featured = true;
    if (q.q) f.$or = [{ name: new RegExp(esc(q.q), 'i') }, { city: new RegExp(esc(q.q), 'i') }];
    return f;
  },
});

// Distinct cities/types for filters (must be before '/:key')
router.get('/meta/filters', asyncH(async (req, res) => {
  const [cities, types] = await Promise.all([
    Hotel.distinct('city', { active: true }),
    Hotel.distinct('type', { active: true }),
  ]);
  res.json({ cities: cities.sort(), types: types.sort() });
}));

// Single hotel by id or slug
router.get('/:key', asyncH(async (req, res) => {
  const { key } = req.params;
  const hotel = mongoose.isValidObjectId(key)
    ? await Hotel.findById(key)
    : await Hotel.findOne({ slug: key });
  if (!hotel || !hotel.active) return res.status(404).json({ message: 'Hotel not found' });
  res.json(hotel);
}));

module.exports = router;
