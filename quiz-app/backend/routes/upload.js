const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');

// Ensure uploads dir
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `quiz-${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
});

/**
 * Parse MCQ text from PDF content.
 * Supports common formats:
 * 1. Q1. Question text
 *    A) opt  B) opt  C) opt  D) opt
 *    Answer: B
 * 2. 1. Question
 *    (a) (b) (c) (d)
 *    Ans: (c)
 */
function parseQuestionsFromText(text) {
  const questions = [];
  // Normalize
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+/g, ' ');

  // Split by question numbers: Q1. / 1. / Question 1 /
  const blocks = cleaned.split(/(?=(?:Q\.?\s*\d+[\.\)\:]|Question\s*\d+[\.\)\:]|\n\d+[\.\)]\s+[A-Z]))/i);

  for (const block of blocks) {
    const b = block.trim();
    if (b.length < 20) continue;

    // Extract question text (first line-ish before options)
    let questionText = '';
    let options = [];
    let correctAnswer = 0;

    // Try pattern: question then A) B) C) D)
    const optPatterns = [
      /(?:^|\n)\s*([A-Da-d])[\.\)\]]\s*(.+?)(?=(?:\n\s*[A-Da-d][\.\)\]]|\n\s*(?:Answer|Ans|Correct)|$))/gis,
      /(?:^|\n)\s*\(([A-Da-d])\)\s*(.+?)(?=(?:\n\s*\([A-Da-d]\)|\n\s*(?:Answer|Ans|Correct)|$))/gis,
    ];

    let matchedOpts = [];
    for (const re of optPatterns) {
      const matches = [...b.matchAll(re)];
      if (matches.length >= 2) {
        matchedOpts = matches;
        break;
      }
    }

    if (matchedOpts.length >= 2) {
      // Question is text before first option
      const firstOptIdx = b.search(/(?:^|\n)\s*[A-Da-d][\.\)\]]|(?:^|\n)\s*\([A-Da-d]\)/i);
      questionText = (firstOptIdx > 0 ? b.slice(0, firstOptIdx) : b)
        .replace(/^(?:Q\.?\s*\d+[\.\)\:]|Question\s*\d+[\.\)\:]|\d+[\.\)])\s*/i, '')
        .replace(/\n+/g, ' ')
        .trim();

      // Sort options by letter
      const optMap = {};
      for (const m of matchedOpts) {
        const letter = m[1].toUpperCase();
        const text = m[2].replace(/\n+/g, ' ').trim();
        if (text) optMap[letter] = text;
      }
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'].filter((l) => optMap[l]);
      options = letters.map((l) => optMap[l]);

      // Answer
      const ansMatch = b.match(/(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-]?\s*[\(\[]?\s*([A-Da-d])/i);
      if (ansMatch) {
        const ansLetter = ansMatch[1].toUpperCase();
        const idx = letters.indexOf(ansLetter);
        if (idx >= 0) correctAnswer = idx;
      }

      if (questionText.length > 5 && options.length >= 2) {
        questions.push({ question: questionText, options, correctAnswer });
      }
    }
  }

  // Fallback: line-based simple parser
  if (questions.length === 0) {
    const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
    let current = null;
    for (const line of lines) {
      const qStart = line.match(/^(?:Q\.?\s*\d+[\.\)\:]|Question\s*\d+[\.\)\:]|\d+[\.\)])\s*(.+)/i);
      const optStart = line.match(/^([A-Da-d])[\.\)\]]\s*(.+)/i) || line.match(/^\(([A-Da-d])\)\s*(.+)/i);
      const ansStart = line.match(/^(?:Answer|Ans)\s*[:\-]?\s*[\(\[]?\s*([A-Da-d])/i);

      if (qStart) {
        if (current && current.options.length >= 2) questions.push(current);
        current = {
          question: qStart[1].trim(),
          options: [],
          correctAnswer: 0,
          _letters: [],
        };
      } else if (optStart && current) {
        current.options.push(optStart[2].trim());
        current._letters.push(optStart[1].toUpperCase());
      } else if (ansStart && current) {
        const idx = current._letters.indexOf(ansStart[1].toUpperCase());
        if (idx >= 0) current.correctAnswer = idx;
      } else if (current && current.options.length === 0 && line.length > 10) {
        current.question += ' ' + line;
      }
    }
    if (current && current.options.length >= 2) {
      delete current._letters;
      questions.push(current);
    }
    questions.forEach((q) => delete q._letters);
  }

  return questions;
}

// Upload PDF and auto-create questions
router.post('/pdf', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file required' });
    }

    const { category, subject, difficulty } = req.body;
    if (!category || !subject) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Category and Subject are required' });
    }

    const cat = await Category.findById(category);
    const sub = await Subject.findById(subject);
    if (!cat || !sub) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid category or subject' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const parsed = parseQuestionsFromText(pdfData.text || '');

    // Cleanup file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    if (parsed.length === 0) {
      return res.status(400).json({
        message: 'No MCQ questions found in PDF. Use format: Q1. ... A) ... B) ... Answer: A',
        textPreview: (pdfData.text || '').slice(0, 500),
      });
    }

    const created = [];
    for (const q of parsed) {
      const doc = await Question.create({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: cat._id,
        subject: sub._id,
        categoryName: cat.name,
        subjectName: sub.name,
        difficulty: difficulty || 'Medium',
      });
      created.push(doc);
    }

    res.status(201).json({
      message: `${created.length} questions imported from PDF`,
      count: created.length,
      questions: created,
    });
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('PDF upload error:', err);
    res.status(500).json({ message: err.message || 'PDF processing failed' });
  }
});

module.exports = router;
