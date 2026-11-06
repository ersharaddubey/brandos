const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');

// Get all syllabus (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.category) filter.category = req.query.category;

    const items = await Syllabus.find(filter)
      .populate('subject', 'name icon')
      .populate('category', 'name icon')
      .sort({ order: 1, title: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single
router.get('/:id', async (req, res) => {
  try {
    const item = await Syllabus.findById(req.params.id)
      .populate('subject', 'name icon')
      .populate('category', 'name icon');
    if (!item) return res.status(404).json({ message: 'Syllabus not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create (Admin)
router.post('/', auth, async (req, res) => {
  try {
    const { title, subject, category, topics, description, order, isActive } = req.body;
    if (!title || !subject || !category) {
      return res.status(400).json({ message: 'Title, subject and category are required' });
    }

    const sub = await Subject.findById(subject);
    if (!sub) return res.status(400).json({ message: 'Invalid subject' });

    const item = new Syllabus({
      title,
      subject,
      category,
      topics: topics || [],
      description: description || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const saved = await item.save();
    const populated = await Syllabus.findById(saved._id)
      .populate('subject', 'name icon')
      .populate('category', 'name icon');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update (Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Syllabus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('subject', 'name icon')
      .populate('category', 'name icon');
    if (!updated) return res.status(404).json({ message: 'Syllabus not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Syllabus.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Syllabus not found' });
    res.json({ message: 'Syllabus deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
