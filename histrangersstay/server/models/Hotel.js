const mongoose = require('mongoose');

// Meal plans of the property: two options (price is per guest per day) + one weekly menu shared by both.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultMealPlan = () => ({
  enabled: true,
  options: [
    { key: 'bd', name: 'Breakfast + Dinner', includes: ['Breakfast', 'Dinner'], price: 300 },
    { key: 'bld', name: 'Breakfast + Lunch + Dinner', includes: ['Breakfast', 'Lunch', 'Dinner'], price: 400 },
  ],
  weekly: [
    { day: 'Monday', breakfast: 'Poha + Tea', lunch: 'Egg Curry Rice', dinner: 'Rajmah + Rice' },
    { day: 'Tuesday', breakfast: 'Bread Omelette + Tea', lunch: 'Kadi Chawal', dinner: 'Sabji Roti' },
    { day: 'Wednesday', breakfast: 'Veg Sandwich', lunch: 'Daal Rice', dinner: 'Kaale Channe Roti / Rice' },
    { day: 'Thursday', breakfast: 'Bread Omelette', lunch: 'Daal Rice', dinner: 'Kofte Roti / Rice' },
    { day: 'Friday', breakfast: 'Poha + Tea', lunch: 'Daal Tadka Rice', dinner: 'Egg Curry + Rice' },
    { day: 'Saturday', breakfast: 'Parantha + Tea', lunch: 'Sabji Roti', dinner: 'Rajmah + Rice' },
    { day: 'Sunday', breakfast: 'Sandwich + Tea', lunch: 'Chole Bhature', dinner: 'Daal Rice' },
  ],
});

const mealOptionSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  includes: { type: [String], default: [] }, // any of Breakfast, Lunch, Dinner
  price: { type: Number, required: true, min: 0 }, // per guest, per day
}, { _id: false });

const mealDaySchema = new mongoose.Schema({
  day: { type: String, enum: DAYS },
  breakfast: { type: String, default: '', trim: true },
  lunch: { type: String, default: '', trim: true },
  dinner: { type: String, default: '', trim: true },
}, { _id: false });

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
  mealPlan: {
    enabled: { type: Boolean, default: true },
    options: { type: [mealOptionSchema], default: () => defaultMealPlan().options },
    weekly: { type: [mealDaySchema], default: () => defaultMealPlan().weekly },
  },
}, { timestamps: true });

hotelSchema.pre('validate', function (next) {
  if (this.isNew && !this.slug && this.name) {
    const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  next();
});

module.exports = mongoose.model('Hotel', hotelSchema);
