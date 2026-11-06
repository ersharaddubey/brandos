const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const auth = require('../middleware/auth');

// Get active banners (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const banners = await Banner.find(filter).sort({ order: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create (Admin)
router.post('/', auth, async (req, res) => {
  try {
    const { title, subtitle, image, link, order, isActive } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const banner = new Banner({
      title,
      subtitle: subtitle || '',
      image: image || '',
      link: link || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const saved = await banner.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update (Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Banner not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Banner.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Banner not found' });
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed default banners
router.post('/seed', auth, async (req, res) => {
  try {
    const count = await Banner.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Banners already exist' });
    }

    const defaults = [
      {
        title: 'SSC CGL 2026',
        subtitle: 'Complete preparation with latest pattern questions',
        order: 1
      },
      {
        title: 'Banking Exams',
        subtitle: 'IBPS, SBI PO & Clerk full syllabus coverage',
        order: 2
      },
      {
        title: 'Railway RRB',
        subtitle: 'NTPC, Group D, ALP practice tests',
        order: 3
      },
      {
        title: 'UPSC Prelims',
        subtitle: 'GS Paper I & CSAT practice',
        order: 4
      }
    ];

    const created = await Banner.insertMany(defaults);
    res.json({ message: `Seeded ${created.length} banners`, banners: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
