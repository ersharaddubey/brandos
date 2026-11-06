require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const { User, Satellite } = require('./models');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if (!(await User.findOne({ email: 'admin@cosmolive.io' })))
    await User.create({ name: 'Admin', email: 'admin@cosmolive.io', password: await bcrypt.hash('Admin@123', 10), role: 'admin' });
  if (!(await Satellite.countDocuments()))
    await Satellite.insertMany([
      { name: 'AstraCube-1', operator: 'Astra Labs', altitudeKm: 550, inclination: 53, lifespanYears: 4.2, revenuePerHour: 184 },
      { name: 'TerraSense-2', operator: 'TerraSense', altitudeKm: 500, inclination: 97.4, lifespanYears: 3.1, revenuePerHour: 240 },
      { name: 'NanoRelay-3', operator: 'NanoRelay', altitudeKm: 600, inclination: 45, lifespanYears: 5.5, revenuePerHour: 120 }
    ]);
  console.log('Seeded'); process.exit(0);
})();
