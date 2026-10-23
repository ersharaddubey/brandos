const express = require('express');
const Booking = require('../models/Booking');
const CafeOrder = require('../models/CafeOrder');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { err } = require('../utils/pricing');

const router = express.Router();
router.use(protect, adminOnly);

// One list of every bill: room bookings (with food and taxes) + Hi Strangers Cafe orders.
// GET /api/billing/admin?type=all|room|cafe&from=YYYY-MM-DD&to=YYYY-MM-DD
// "Billed" totals leave out cancelled bookings / orders.
router.get('/admin', asyncH(async (req, res) => {
  const { type = 'all', from, to } = req.query;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(new Date(to).getTime() + 86400000 - 1);
  const dateFilter = from || to ? { createdAt: range } : {};

  const [bookings, orders] = await Promise.all([
    type === 'cafe' ? [] : Booking.find(dateFilter).sort({ createdAt: -1 }).populate('room', 'name'),
    type === 'room' ? [] : CafeOrder.find(dateFilter).sort({ createdAt: -1 }),
  ]);

  const rows = [
    ...bookings.map((b) => ({
      kind: 'room', id: b._id, ref: b.invoiceNo || b.reference, name: b.guest.name, phone: b.guest.phone,
      date: b.createdAt, detail: `${b.room?.name || 'Room'} · ${b.nights} night${b.nights === 1 ? '' : 's'}`,
      amount: b.totalAmount || 0, food: b.foodTotal || 0, status: b.status,
    })),
    ...orders.map((o) => ({
      kind: 'cafe', id: o._id, ref: o.orderNo, name: o.customer.name, phone: o.customer.phone,
      date: o.createdAt, detail: `Cafe · ${o.orderType}${o.place ? ` ${o.place}` : ''}`,
      amount: o.total || 0, food: o.total || 0, status: o.status,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const live = rows.filter((r) => r.status !== 'cancelled');
  const sum = (arr) => arr.reduce((s, r) => s + r.amount, 0);
  res.json({
    rows,
    totals: {
      bills: live.length,
      billed: sum(live),
      room: sum(live.filter((r) => r.kind === 'room')),
      cafe: sum(live.filter((r) => r.kind === 'cafe')),
      foodAll: live.reduce((s, r) => s + r.food, 0),
    },
  });
}));

// Admin can open any booking's invoice (the customer route only allows the booking owner)
router.get('/booking/:id', asyncH(async (req, res) => {
  const b = await Booking.findById(req.params.id)
    .populate('hotel', 'name city state address phone email images').populate('room', 'name type images');
  if (!b) throw err('Booking not found', 404);
  res.json(b);
}));

module.exports = router;
