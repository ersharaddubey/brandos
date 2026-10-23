const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Volunteer = require('../models/Volunteer');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { err } = require('../utils/pricing');

const router = express.Router();
const MIN_FOLLOWERS = 5000;
const OK_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (OK_TYPES.includes(file.mimetype) ? cb(null, true) : cb(err('Resume must be a PDF or Word file'))),
});
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many applications from this connection. Please try again later.' } });

// Public: apply (multipart form, resume field name: "resume")
router.post('/', limiter, (req, res, next) => upload.single('resume')(req, res, (e) => {
  if (e) return next(e.code === 'LIMIT_FILE_SIZE' ? err('Resume is too large. Maximum 2 MB.') : e);
  next();
}), asyncH(async (req, res) => {
  const b = req.body;
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const age = Number(b.age);
  const followers = Number(b.followers);
  const instagram = String(b.instagram || '').trim();
  const youtube = String(b.youtube || '').trim();
  const skills = String(b.skills || '').trim();
  const why = String(b.why || '').trim();

  if (!name) throw err('Please enter your name');
  if (!Number.isFinite(age) || age < 14 || age > 99) throw err('Please enter a valid age');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw err('Please enter a valid email');
  if (!instagram && !youtube) throw err('Please share your Instagram or YouTube link');
  if (!Number.isFinite(followers) || followers < MIN_FOLLOWERS) throw err(`We currently collaborate with creators who have at least ${MIN_FOLLOWERS.toLocaleString('en-IN')} followers`);
  if (!skills) throw err('Please tell us your skills');
  if (!why) throw err('Please tell us why we should select you');
  if (!req.file) throw err('Please attach your resume (PDF or Word, max 2 MB)');

  await Volunteer.create({
    name, age, email, instagram, youtube, followers, skills, why,
    resume: { filename: req.file.originalname, contentType: req.file.mimetype, data: req.file.buffer },
  });
  res.status(201).json({ message: 'Thank you! We have received your application and will contact you by email.' });
}));

// Admin: list (without the resume bytes)
router.get('/admin/all', protect, adminOnly, asyncH(async (req, res) => {
  res.json(await Volunteer.find().sort({ createdAt: -1 }));
}));

router.get('/:id/resume', protect, adminOnly, asyncH(async (req, res) => {
  const v = await Volunteer.findById(req.params.id).select('+resume.data');
  if (!v?.resume?.data) return res.status(404).json({ message: 'No resume found' });
  res.set('Content-Type', v.resume.contentType || 'application/octet-stream');
  res.set('Content-Disposition', `attachment; filename="${String(v.resume.filename || 'resume').replace(/[^\w.\- ]/g, '_')}"`);
  res.send(v.resume.data);
}));

router.patch('/:id/status', protect, adminOnly, asyncH(async (req, res) => {
  if (!['new', 'shortlisted', 'rejected'].includes(req.body.status)) throw err('Invalid status');
  const v = await Volunteer.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!v) throw err('Not found', 404);
  res.json(v);
}));

router.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
  await Volunteer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
