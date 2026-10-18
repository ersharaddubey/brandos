const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, trim: true },
  country: { type: String, default: 'India' },
  type: { type: String, enum: ['Hostel', 'Guesthouse', 'Homestay', 'Palace', 'Resort', 'City Hotel', 'Safari', 'Heritage'], default: 'Hostel' },
  brand: { type: String, default: 'Signature' },
  tagline: String,
  description: String,
  images: [String],
  amenities: [String],
  rating: { type: Number, min: 0, max: 5, default: 4.5 },
  startingPrice: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  address: String,
  phone: String,
  email: String,
}, { timestamps: true });

hotelSchema.pre('validate', function (next) {
  if (this.isNew && !this.slug && this.name) {
    const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  next();
});

module.exports = mongoose.model('Hotel', hotelSchema);
