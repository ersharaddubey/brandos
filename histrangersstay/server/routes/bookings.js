const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');
const { resolveCoupon, buildFoodLines, totals, err } = require('../utils/pricing');

const router = express.Router();
const DAY = 86400000;

const populateAll = (q) => q
  .populate('hotel', 'name city state address phone email images')
  .populate('room', 'name type images');

const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

// Does this booking belong to the logged-in customer? (made while logged in, or booked earlier with the same email)
const owns = (user, b) => (b.user && String(b.user) === String(user._id)) || b.guest.email === user.email;

// Public (guest or logged in): create a booking, with optional coupon and food
router.post('/', optionalAuth, asyncH(async (req, res) => {
  const { room: roomId, checkIn, checkOut, adults = 1, children = 0, guest = {}, specialRequests, coupon, food } = req.body;
  if (!guest.name || !guest.email || !guest.phone) {
    return res.status(400).json({ message: 'Guest name, email and phone are required' });
  }
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  if (isNaN(ci) || isNaN(co)) return res.status(400).json({ message: 'Please choose valid dates' });
  if (co <= ci) return res.status(400).json({ message: 'Check-out must be after check-in' });
  const today = startOfToday();
  if (ci < today) return res.status(400).json({ message: 'Check-in cannot be in the past' });

  const room = await Room.findById(roomId);
  if (!room || !room.active) return res.status(404).json({ message: 'Room not available' });
  if (Number(adults) + Number(children) > room.maxGuests) {
    return res.status(400).json({ message: `This room fits up to ${room.maxGuests} guests` });
  }

  const taken = await Booking.countDocuments({
    room: room._id,
    status: { $in: ['pending', 'confirmed'] },
    checkIn: { $lt: co },
    checkOut: { $gt: ci },
  });
  if (taken >= room.totalRooms) {
    return res.status(409).json({ message: 'Sold out for these dates. Please try different dates.' });
  }

  const nights = Math.round((co - ci) / DAY);
  const settings = await Settings.getSingleton();
  const roomCharges = nights * room.pricePerNight;

  // Coupon and food are priced on the server, so the total can never be tampered with
  const applied = await resolveCoupon(coupon, { subtotal: roomCharges, nights, checkIn: ci });
  const foodLines = await buildFoodLines(food);
  const money = totals({
    nightlyRate: room.pricePerNight, nights, discount: applied?.discount || 0,
    food: foodLines, taxPercent: settings.taxPercent ?? 5,
  });

  const booking = await Booking.create({
    user: req.user?._id,
    hotel: room.hotel, room: room._id,
    guest: { name: guest.name, email: guest.email, phone: guest.phone },
    checkIn: ci, checkOut: co, adults, children, nights,
    couponCode: applied?.offer.code || '',
    couponTitle: applied?.offer.title || '',
    discountPercent: applied?.offer.discountPercent || 0,
    food: foodLines,
    ...money,
    specialRequests,
  });
  res.status(201).json(booking);
}));

// Public: look up a booking with reference + email
router.get('/lookup', asyncH(async (req, res) => {
  const reference = String(req.query.reference || '');
  const email = String(req.query.email || '');
  const booking = await populateAll(Booking.findOne({
    reference: reference.trim().toUpperCase(),
    'guest.email': email.trim().toLowerCase(),
  }));
  if (!booking) return res.status(404).json({ message: 'No booking found with these details' });
  res.json(booking);
}));

// Customer: all my bookings (newest stay first)
router.get('/mine', protect, asyncH(async (req, res) => {
  const rows = await populateAll(Booking.find({
    $or: [{ user: req.user._id }, { 'guest.email': req.user.email }],
  }).sort({ checkIn: -1, createdAt: -1 }));
  res.json(rows);
}));

// Customer: one of my bookings
router.get('/mine/:id', protect, asyncH(async (req, res) => {
  const b = await populateAll(Booking.findById(req.params.id));
  if (!b || !owns(req.user, b)) return res.status(404).json({ message: 'Booking not found' });
  res.json(b);
}));

// Customer: replace the food order on my booking. Body: { items: [{ item, qty }] }  (empty list removes all food)
router.put('/mine/:id/food', protect, asyncH(async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('room', 'pricePerNight');
  if (!b || !owns(req.user, b)) return res.status(404).json({ message: 'Booking not found' });
  if (!['pending', 'confirmed'].includes(b.status)) throw err('Food can only be changed on an active booking');
  if (new Date(b.checkOut) < startOfToday()) throw err('This stay has already ended');

  const settings = await Settings.getSingleton();
  const foodLines = await buildFoodLines(req.body.items);
  const money = totals({
    nightlyRate: b.nights ? b.subtotal / b.nights : b.room?.pricePerNight || 0,
    nights: b.nights,
    discount: b.discount || 0,
    food: foodLines,
    taxPercent: b.taxPercent ?? settings.taxPercent ?? 5,
  });
  b.food = foodLines;
  b.foodTotal = money.foodTotal;
  b.taxPercent = money.taxPercent;
  b.taxes = money.taxes;
  b.totalAmount = money.totalAmount;
  if (!b.user) b.user = req.user._id;
  await b.save();
  res.json(await populateAll(Booking.findById(b._id)));
}));

// Customer: cancel my booking before check-in
router.patch('/mine/:id/cancel', protect, asyncH(async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b || !owns(req.user, b)) return res.status(404).json({ message: 'Booking not found' });
  if (!['pending', 'confirmed'].includes(b.status)) throw err('This booking cannot be cancelled');
  if (new Date(b.checkIn) < startOfToday()) throw err('The stay has already started. Please contact the property.');
  b.status = 'cancelled';
  await b.save();
  res.json(await populateAll(Booking.findById(b._id)));
}));

// Admin: list all
router.get('/', protect, adminOnly, asyncH(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Booking.find(filter).sort({ createdAt: -1 })
    .populate('hotel', 'name city').populate('room', 'name'));
}));

// Admin: update status
router.patch('/:id/status', protect, adminOnly, asyncH(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!booking) return res.status(404).json({ message: 'Not found' });
  res.json(booking);
}));

router.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

module.exports = router;
