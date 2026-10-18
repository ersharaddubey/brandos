const Room = require('../models/Room');
const crud = require('../utils/crud');

module.exports = crud(Room, {
  populate: 'hotel',
  sort: { pricePerNight: 1 },
  publicFilter: () => ({ active: true }),
  publicQuery: (q) => (q.hotel ? { hotel: q.hotel } : {}),
});
