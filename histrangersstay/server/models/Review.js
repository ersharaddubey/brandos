const mongoose = require('mongoose');

// Guest review shown on the diary-style Reviews page and on the home page.
// Managed in Admin > Reviews.
const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  country: { type: String, default: '', trim: true, maxlength: 80 },
  text: { type: String, required: true, trim: true, maxlength: 1500 },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  stayedOn: { type: String, default: '', trim: true, maxlength: 40 }, // free text, e.g. "Aug 2025"
  published: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0 }, // lower number shows first; same number = newest first
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
