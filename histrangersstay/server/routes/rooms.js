const Room = require('../models/Room');
const Booking = require('../models/Booking');
const crud = require('../utils/crud');
const asyncH = require('../utils/asyncH');

const router = crud(Room, {
  populate: 'hotel',
  sort: { pricePerNight: 1 },
  publicFilter: () => ({ active: true }),
  publicQuery: (q) => (q.hotel ? { hotel: q.hotel } : {}),
});

// Public: how many rooms of each type are still free for the chosen dates.
//   GET /api/rooms/availability?checkIn=2026-11-10&checkOut=2026-11-12[&hotel=ID]
// Uses the same rule as booking creation (pending + confirmed bookings that overlap the dates),
// so what the website shows always matches what the server will accept.
router.get('/availability', asyncH(async (req, res) => {
  const ci = new Date(req.query.checkIn);
  const co = new Date(req.query.checkOut);
  if (isNaN(ci) || isNaN(co) || co <= ci) return res.status(400).json({ message: 'Please choose valid dates' });

  const rooms = await Room.find({ active: true, ...(req.query.hotel ? { hotel: req.query.hotel } : {}) }).select('totalRooms');
  const taken = await Booking.aggregate([
    { $match: { room: { $in: rooms.map((r) => r._id) }, status: { $in: ['pending', 'confirmed'] }, checkIn: { $lt: co }, checkOut: { $gt: ci } } },
    { $group: { _id: '$room', n: { $sum: 1 } } },
  ]);
  const byRoom = new Map(taken.map((t) => [String(t._id), t.n]));

  res.json(rooms.map((r) => {
    const booked = byRoom.get(String(r._id)) || 0;
    const left = Math.max(0, (r.totalRooms || 0) - booked);
    return { room: r._id, totalRooms: r.totalRooms, booked, left, available: left > 0 };
  }));
}));

module.exports = router;
