const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  tag: String,
  description: String,
  image: String,
  code: { type: String, uppercase: true, trim: true },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  // Optional rules, checked when a guest applies the code
  minNights: { type: Number, default: 0, min: 0 },        // 0 = no minimum
  weekdaysOnly: { type: Boolean, default: false },         // check-in must be Monday to Thursday
  maxDiscount: { type: Number, default: 0, min: 0 },       // INR cap on the discount, 0 = no cap
  validTill: Date,
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
