const Location = require('../models/Location');
const crud = require('../utils/crud');

// Public: GET /api/locations (active only). Admin: /admin/all, POST, PUT, DELETE
module.exports = crud(Location, {
  sort: { order: 1, createdAt: 1 },
  publicFilter: () => ({ active: true }),
});
