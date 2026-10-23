const express = require('express');
const rateLimit = require('express-rate-limit');
const Booking = require('../models/Booking');
const CheckIn = require('../models/CheckIn');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { err } = require('../utils/pricing');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });

// Guest proves the booking with reference + the email used while booking
async function findBooking(reference, email) {
  const b = await Booking.findOne({
    reference: String(reference || '').trim().toUpperCase(),
    'guest.email': String(email || '').trim().toLowerCase(),
  }).populate('room', 'name').populate('hotel', 'name city');
  if (!b) throw err('No booking found with these details', 404);
  if (b.status === 'cancelled') throw err('This booking is cancelled, so web check-in is not available');
  return b;
}

const summary = (b, existing) => ({
  reference: b.reference, guestName: b.guest.name, phone: b.guest.phone,
  room: b.room?.name, hotel: b.hotel?.name, checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights,
  adults: b.adults, children: b.children, existing: existing || null,
});

// Public step 1: find my booking (and any check-in already filled)
router.post('/lookup', limiter, asyncH(async (req, res) => {
  const b = await findBooking(req.body.reference, req.body.email);
  res.json(summary(b, await CheckIn.findOne({ booking: b._id })));
}));

// Public step 2: submit (or update, until the property marks it checked-in)
router.post('/', limiter, asyncH(async (req, res) => {
  const b = await findBooking(req.body.reference, req.body.email);
  const guests = (Array.isArray(req.body.guests) ? req.body.guests : []).map((g) => ({
    name: String(g?.name || '').trim(),
    age: g?.age === '' || g?.age == null ? undefined : Number(g.age),
    gender: String(g?.gender || ''),
    idType: String(g?.idType || ''),
    idNumber: String(g?.idNumber || '').trim(),
  }));
  if (!guests.length) throw err('Add at least one guest');
  guests.forEach((g, i) => {
    if (!g.name) throw err(`Guest ${i + 1}: please enter the name`);
    if (g.age === undefined || Number.isNaN(g.age)) throw err(`Guest ${i + 1}: please enter the age`);
    if (g.age >= 18 && (!g.idType || !g.idNumber)) throw err(`Guest ${i + 1}: ID type and ID number are required for adults`);
  });
  if (req.body.agreed !== true) throw err('Please accept the declaration to continue');

  const data = {
    reference: b.reference, guests,
    arrivalTime: String(req.body.arrivalTime || ''), comingFrom: String(req.body.comingFrom || ''),
    vehicle: String(req.body.vehicle || ''), purpose: String(req.body.purpose || ''),
    emergencyName: String(req.body.emergencyName || ''), emergencyPhone: String(req.body.emergencyPhone || ''),
    requests: String(req.body.requests || ''),
  };
  const existing = await CheckIn.findOne({ booking: b._id });
  if (existing?.status === 'checked-in') throw err('You are already checked in. Please contact the property for any change.');
  const saved = existing
    ? await CheckIn.findByIdAndUpdate(existing._id, { ...data, status: 'submitted' }, { new: true })
    : await CheckIn.create({ ...data, booking: b._id });
  res.status(existing ? 200 : 201).json(saved);
}));

// Admin
router.get('/admin/all', protect, adminOnly, asyncH(async (req, res) => {
  res.json(await CheckIn.find().sort({ createdAt: -1 }).populate({ path: 'booking', select: 'reference guest checkIn checkOut nights room', populate: { path: 'room', select: 'name' } }));
}));

router.patch('/:id/status', protect, adminOnly, asyncH(async (req, res) => {
  const status = req.body.status;
  if (!['submitted', 'checked-in', 'cancelled'].includes(status)) throw err('Invalid status');
  const c = await CheckIn.findByIdAndUpdate(req.params.id, { status, checkedInAt: status === 'checked-in' ? new Date() : undefined }, { new: true });
  if (!c) throw err('Not found', 404);
  res.json(c);
}));

router.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
  await CheckIn.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
