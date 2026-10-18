const Offer = require('../models/Offer');
const Room = require('../models/Room');
const crud = require('../utils/crud');
const asyncH = require('../utils/asyncH');
const { resolveCoupon } = require('../utils/pricing');

const DAY = 24 * 60 * 60 * 1000;

const router = crud(Offer, {
  // An offer shows while it is switched on and its "Valid till" date has not fully passed.
  // The date is saved as midnight at the start of that day, so we allow one extra day;
  // otherwise an offer set to end today (or tomorrow early morning) would vanish immediately.
  publicFilter: () => ({
    active: true,
    $or: [{ validTill: null }, { validTill: { $exists: false } }, { validTill: { $gte: new Date(Date.now() - DAY) } }],
  }),
});

// Public: check a coupon code for a room and dates and return the discount it gives.
// The booking form calls this when the guest presses "Apply".
router.post('/validate', asyncH(async (req, res) => {
  const { code, room: roomId, checkIn, checkOut } = req.body || {};
  if (!String(code || '').trim()) return res.status(400).json({ message: 'Enter a coupon code' });

  const room = await Room.findById(roomId);
  if (!room) return res.status(400).json({ message: 'Please choose a room first' });
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  if (isNaN(ci) || isNaN(co) || co <= ci) return res.status(400).json({ message: 'Please choose valid dates first' });

  const nights = Math.round((co - ci) / DAY);
  const subtotal = nights * room.pricePerNight;
  const { offer, discount } = await resolveCoupon(code, { subtotal, nights, checkIn: ci });

  res.json({
    valid: true,
    code: offer.code,
    title: offer.title,
    discountPercent: offer.discountPercent || 0,
    discount,
    message: discount > 0
      ? `Coupon applied: ${offer.discountPercent}% off, you save ${discount}`
      : `Offer applied: ${offer.title}`,
  });
}));

module.exports = router;
