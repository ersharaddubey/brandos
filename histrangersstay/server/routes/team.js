const TeamMember = require('../models/TeamMember');
const crud = require('../utils/crud');

// Public: GET /api/team (active only). Admin: /admin/all, POST, PUT, DELETE
module.exports = crud(TeamMember, {
  sort: { order: 1, createdAt: 1 },
  publicFilter: () => ({ active: true }),
});
