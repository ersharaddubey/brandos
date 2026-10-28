const express = require('express');
const rateLimit = require('express-rate-limit');
const CafeOrder = require('../models/CafeOrder');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { buildFoodLines, err } = require('../utils/pricing');

const router = express.Router();
const STATUSES = ['placed', 'preparing', 'served', 'paid', 'cancelled'];
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many orders from this connection. Please try again later.' } });
const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// Public: place a cafe order. Prices always come from the live menu, never from the browser.
router.post('/', limiter, asyncH(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  if (!name) throw err('Please enter your name');
  if (digits(phone).length < 10) throw err('Please enter a valid 10-digit phone number');
  const items = await buildFoodLines(req.body.items);
  if (!items.length) throw err('Please add at least one item');

  const orderType = ['dine-in', 'takeaway', 'room'].includes(req.body.orderType) ? req.body.orderType : 'dine-in';
  const subtotal = items.reduce((s, l) => s + l.total, 0);
  const order = await CafeOrder.create({
    customer: { name, phone }, orderType, place: String(req.body.place || '').trim(),
    note: String(req.body.note || '').trim(), items, subtotal, total: subtotal,
    source: req.body.source === 'qr' ? 'qr' : 'web',
    guest: req.body.guest === true,
  });
  res.status(201).json(order);
}));

// Bill: the customer needs the order number + phone; an admin token also works
router.get('/bill/:orderNo', optionalAuth, asyncH(async (req, res) => {
  const o = await CafeOrder.findOne({ orderNo: String(req.params.orderNo).toUpperCase() });
  const isAdmin = req.user?.role === 'admin';
  if (!o || (!isAdmin && digits(o.customer.phone) !== digits(req.query.phone))) throw err('Bill not found. Check the order number and phone.', 404);
  res.json(o);
}));

// Admin
router.get('/admin/all', protect, adminOnly, asyncH(async (req, res) => {
  res.json(await CafeOrder.find().sort({ createdAt: -1 }).limit(500));
}));

router.patch('/:id/status', protect, adminOnly, asyncH(async (req, res) => {
  const patch = {};
  if (req.body.status) {
    if (!STATUSES.includes(req.body.status)) throw err('Invalid status');
    patch.status = req.body.status;
  }
  if (req.body.paymentMode !== undefined) patch.paymentMode = String(req.body.paymentMode);
  const o = await CafeOrder.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!o) throw err('Not found', 404);
  res.json(o);
}));

router.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
  await CafeOrder.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
