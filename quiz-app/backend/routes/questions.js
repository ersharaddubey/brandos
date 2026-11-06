const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');

// Get all questions (public - for mobile app)
router.get('/', async (req, res) => {
  try {
    const { category, subject, syllabus, difficulty, limit } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (syllabus) filter.syllabus = syllabus;
    if (difficulty) filter.difficulty = difficulty;

    let query = Question.find(filter)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title')
      .select('-__v');

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const questions = await query.sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single question
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create question (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { question, options, correctAnswer, category, subject, syllabus, difficulty, explanation } = req.body;

    if (!question || !options || options.length < 2 || correctAnswer === undefined) {
      return res.status(400).json({ message: 'Please provide question, at least 2 options and correctAnswer index' });
    }

    if (!category || !subject) {
      return res.status(400).json({ message: 'Category and Subject are required' });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({ message: 'correctAnswer index is invalid' });
    }

    const cat = await Category.findById(category);
    const sub = await Subject.findById(subject);
    if (!cat || !sub) {
      return res.status(400).json({ message: 'Invalid category or subject' });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      category,
      subject,
      syllabus: syllabus || undefined,
      categoryName: cat.name,
      subjectName: sub.name,
      difficulty: difficulty || 'Medium',
      explanation: explanation || ''
    });

    const saved = await newQuestion.save();
    const populated = await Question.findById(saved._id)
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update question (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.category) {
      const cat = await Category.findById(body.category);
      if (cat) body.categoryName = cat.name;
    }
    if (body.subject) {
      const sub = await Subject.findById(body.subject);
      if (sub) body.subjectName = sub.name;
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('category', 'name icon')
      .populate('subject', 'name icon')
      .populate('syllabus', 'title');

    if (!updated) return res.status(404).json({ message: 'Question not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete question (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
