const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, default: 'Deluxe' },
  description: String,
  pricePerNight: { type: Number, required: true, min: 0 },
  maxGuests: { type: Number, default: 2, min: 1 },
  size: { type: Number, default: 300 },
  bedType: { type: String, default: 'King' },
  images: [String],
  amenities: [String],
  totalRooms: { type: Number, default: 10, min: 1 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
