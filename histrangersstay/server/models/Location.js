const mongoose = require('mongoose');

// A Hi Strangers location (Manali live, Kasol / Bir upcoming, more later). Managed in Admin > Locations.
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, default: '', trim: true },
  state: { type: String, default: '', trim: true },
  status: { type: String, enum: ['live', 'upcoming'], default: 'upcoming' },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  link: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);
