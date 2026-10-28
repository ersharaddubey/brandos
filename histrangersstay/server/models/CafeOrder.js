const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
  name: String,
  category: String,
  veg: { type: Boolean, default: true },
  price: Number,
  qty: { type: Number, min: 1 },
  total: Number,
}, { _id: false });

// Hi Strangers Cafe order (walk-in, takeaway or to a room). Menu prices already include GST.
const cafeOrderSchema = new mongoose.Schema({
  orderNo: { type: String, unique: true, index: true },
  customer: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'room'], default: 'dine-in' },
  place: { type: String, default: '', trim: true },   // table number or room name
  note: { type: String, default: '' },
  items: { type: [lineSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['placed', 'preparing', 'served', 'paid', 'cancelled'], default: 'placed' },
  paymentMode: { type: String, default: '' },
  // 'qr' = guest scanned the table QR code, 'web' = ordered from the website. guest = ordered without an account.
  source: { type: String, enum: ['web', 'qr'], default: 'web' },
  guest: { type: Boolean, default: false },
}, { timestamps: true });

cafeOrderSchema.pre('validate', function (next) {
  if (!this.orderNo) this.orderNo = `CF${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  next();
});

module.exports = mongoose.model('CafeOrder', cafeOrderSchema);
