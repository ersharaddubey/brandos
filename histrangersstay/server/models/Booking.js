const mongoose = require('mongoose');

const foodLineSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
  name: String,
  category: String,
  veg: { type: Boolean, default: true },
  price: Number,
  qty: { type: Number, min: 1 },
  total: Number,
}, { _id: false });

const mealPlanLineSchema = new mongoose.Schema({
  key: String,
  name: String,
  includes: [String],
  pricePerPerson: Number, // per guest per day
  guests: Number,
  days: Number,
  total: Number,
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  reference: { type: String, unique: true, index: true },
  invoiceNo: String,
  // Set when the guest was logged in while booking (older bookings are matched by email)
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  guest: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  nights: Number,
  adults: { type: Number, default: 1 },
  children: { type: Number, default: 0 },
  // Money. subtotal = room charges before discount.
  // totalAmount = subtotal - discount + foodTotal + mealTotal + taxes
  subtotal: Number,
  couponCode: { type: String, default: '' },
  couponTitle: { type: String, default: '' },
  discountPercent: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  food: { type: [foodLineSchema], default: [] },
  foodTotal: { type: Number, default: 0 },
  mealPlan: { type: mealPlanLineSchema, default: null },
  mealTotal: { type: Number, default: 0 },
  taxPercent: Number,
  taxes: Number,
  totalAmount: Number,
  specialRequests: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
}, { timestamps: true });

bookingSchema.pre('validate', function (next) {
  if (!this.reference) {
    this.reference = 'BK' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString().slice(-3);
  }
  if (!this.invoiceNo) this.invoiceNo = `INV-${this.reference}`;
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
