const express = require('express');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const Offer = require('../models/Offer');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');

const router = express.Router();

router.get('/stats', protect, adminOnly, asyncH(async (req, res) => {
  const [hotels, rooms, offers, bookings, revenueAgg, byStatus, topHotels, recent] = await Promise.all([
    Hotel.countDocuments(),
    Room.countDocuments(),
    Offer.countDocuments({ active: true }),
    Booking.countDocuments(),
    Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$hotel', bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
      { $unwind: '$hotel' },
      { $project: { name: '$hotel.name', city: '$hotel.city', bookings: 1, revenue: 1 } },
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(6)
      .populate('hotel', 'name city').populate('room', 'name'),
  ]);

  res.json({
    counts: { hotels, rooms, offers, bookings },
    revenue: revenueAgg[0]?.total || 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    topHotels,
    recent,
  });
}));

module.exports = router;
