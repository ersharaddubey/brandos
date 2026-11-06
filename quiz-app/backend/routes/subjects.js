const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Get all subjects (public) - optional filter by category
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    if (req.query.category) filter.category = req.query.category;

    const subjects = await Subject.find(filter)
      .populate('category', 'name icon')
      .sort({ order: 1, name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single subject
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('category', 'name icon');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create subject (Admin)
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, description, icon, order, isActive } = req.body;
    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required' });
    }

    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ message: 'Invalid category' });

    const subject = new Subject({
      name,
      category,
      description: description || '',
      icon: icon || '📖',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const saved = await subject.save();
    const populated = await Subject.findById(saved._id).populate('category', 'name icon');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists in this category' });
    }
    res.status(500).json({ message: err.message });
  }
});

// Update subject (Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name icon');
    if (!updated) return res.status(404).json({ message: 'Subject not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete subject (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed common subjects for government exams
router.post('/seed', auth, async (req, res) => {
  try {
    const categories = await Category.find();
    if (categories.length === 0) {
      return res.status(400).json({ message: 'First seed categories' });
    }

    const commonSubjects = [
      { name: 'Quantitative Aptitude', icon: '🔢' },
      { name: 'Reasoning Ability', icon: '🧠' },
      { name: 'English Language', icon: '📝' },
      { name: 'General Awareness', icon: '🌍' },
      { name: 'General Knowledge', icon: '💡' },
      { name: 'Current Affairs', icon: '📰' },
      { name: 'Computer Awareness', icon: '💻' },
      { name: 'General Science', icon: '🔬' },
      { name: 'History', icon: '📜' },
      { name: 'Geography', icon: '🗺️' },
      { name: 'Polity', icon: '⚖️' },
      { name: 'Economy', icon: '📈' }
    ];

    const created = [];
    for (const cat of categories) {
      for (const sub of commonSubjects) {
        const exists = await Subject.findOne({ name: sub.name, category: cat._id });
        if (!exists) {
          const s = await Subject.create({
            name: sub.name,
            category: cat._id,
            icon: sub.icon,
            order: commonSubjects.indexOf(sub) + 1
          });
          created.push(s);
        }
      }
    }
    res.json({ message: `Seeded ${created.length} subjects` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
