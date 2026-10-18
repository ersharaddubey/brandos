const mongoose = require('mongoose');

// Food menu item. Guests can add these while booking a room (or later from My Account).
const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Main course', trim: true },
  price: { type: Number, required: true, min: 0 },
  veg: { type: Boolean, default: true },
  image: { type: String, default: '' },
  order: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', foodItemSchema);
