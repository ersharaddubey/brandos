const express = require('express');
const GalleryItem = require('../models/GalleryItem');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { cloudOn, saveImage, removeImage, many } = require('../utils/media');

const router = express.Router();
const SIZES = ['auto', 'small', 'wide', 'tall', 'large'];
const sorted = () => GalleryItem.find().sort({ order: 1, createdAt: 1 }).lean();

// Public: the gallery, in display order
router.get('/', asyncH(async (req, res) => res.json(await sorted())));

// Admin: is Cloudinary connected?
router.get('/status', protect, adminOnly, (req, res) => res.json({ cloudinary: cloudOn() }));

// Admin: upload up to 12 images at once (field "images"), or add one by URL ({ url, caption })
router.post('/', protect, adminOnly, many('images', 12), asyncH(async (req, res) => {
  const last = await GalleryItem.findOne().sort({ order: -1 }).select('order').lean();
  let order = last ? last.order + 1 : 0;
  const made = [];

  if (req.files?.length) {
    for (const file of req.files) {
      const { url, publicId } = await saveImage(file, req, 'gallery');
      made.push(await GalleryItem.create({ url, publicId, order: order++ }));
    }
  } else if (req.body?.url) {
    if (!/^https?:\/\//i.test(req.body.url)) return res.status(400).json({ message: 'Enter a valid image link' });
    made.push(await GalleryItem.create({ url: req.body.url, caption: req.body.caption || '', order: order++ }));
  } else {
    return res.status(400).json({ message: 'No image received' });
  }
  res.status(201).json(made);
}));

// Admin: save a new order. Body: { ids: [id, id, ...] }  (must be before "/:id")
router.put('/reorder', protect, adminOnly, asyncH(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length) await GalleryItem.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { order: i } } })));
  res.json(await sorted());
}));

// Admin: change caption and/or size
router.put('/:id', protect, adminOnly, asyncH(async (req, res) => {
  const patch = {};
  if (typeof req.body.caption === 'string') patch.caption = req.body.caption.slice(0, 200);
  if (SIZES.includes(req.body.size)) patch.size = req.body.size;
  const doc = await GalleryItem.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!doc) return res.status(404).json({ message: 'Photo not found' });
  res.json(doc);
}));

// Admin: delete (also removes it from Cloudinary)
router.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
  const doc = await GalleryItem.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Photo not found' });
  await removeImage(doc.publicId);
  res.json({ ok: true });
}));

module.exports = router;
