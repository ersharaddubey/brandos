const FoodItem = require('../models/FoodItem');
const crud = require('../utils/crud');

module.exports = crud(FoodItem, {
  sort: { category: 1, order: 1, name: 1 },
  publicFilter: () => ({ available: true }),
});
