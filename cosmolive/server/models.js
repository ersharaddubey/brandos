const m = require('mongoose');
const User = m.model('User', new m.Schema({
  name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true }));
const Satellite = m.model('Satellite', new m.Schema({
  name: String, operator: String, altitudeKm: Number, inclination: Number, lifespanYears: Number, revenuePerHour: Number
}, { timestamps: true }));
const Waitlist = m.model('Waitlist', new m.Schema({
  email: { type: String, unique: true, lowercase: true }, type: { type: String, default: 'explorer' }
}, { timestamps: true }));
module.exports = { User, Satellite, Waitlist };
