const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { saveImage, single } = require('../utils/media');

const router = express.Router();

// Used by Hotels, Rooms, Offers and Site settings (field name: "image")
router.post('/', protect, adminOnly, single('image'), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image received' });
  const { url, publicId } = await saveImage(req.file, req, 'site');
  res.json({ url, publicId });
}));

module.exports = router;
