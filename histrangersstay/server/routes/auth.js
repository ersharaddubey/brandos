const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');

const router = express.Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', asyncH(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(400).json({ message: 'An account with this email already exists' });

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: (phone || '').trim(),
    password,
    role: 'customer',
  });

  res.status(201).json({
    token: sign(user._id),
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
}));

router.post('/login', asyncH(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  res.json({
    token: sign(user._id),
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone || '', role: user.role },
  });
}));

router.get('/me', protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      role: req.user.role,
    },
  });
});

// Customer: update own name and phone
router.put('/me', protect, asyncH(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    req.user.name = String(name).trim();
  }
  if (phone !== undefined) req.user.phone = String(phone).trim();
  await req.user.save();
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone || '', role: req.user.role },
  });
}));

module.exports = router;
