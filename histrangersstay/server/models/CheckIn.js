const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, min: 0, max: 120 },
  gender: { type: String, default: '' },
  idType: { type: String, default: '' },
  idNumber: { type: String, default: '', trim: true },
}, { _id: false });

// Web check-in: filled by the guest before arrival, linked to one booking.
const checkInSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  reference: { type: String, index: true },
  arrivalTime: { type: String, default: '' },
  comingFrom: { type: String, default: '' },
  vehicle: { type: String, default: '' },
  purpose: { type: String, default: '' },
  guests: { type: [guestSchema], default: [] },
  emergencyName: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  requests: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'checked-in', 'cancelled'], default: 'submitted' },
  checkedInAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('CheckIn', checkInSchema);
