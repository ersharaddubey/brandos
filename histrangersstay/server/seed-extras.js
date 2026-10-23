// Adds the starting Locations and one Leadership card WITHOUT touching bookings, rooms or the food menu.
// Run: npm run seed:extras   (safe to run again: existing locations / team are not duplicated)
require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('./models/Location');
const TeamMember = require('./models/TeamMember');

const locations = [
  { name: 'Manali', city: 'Naggar, Manali', state: 'Himachal Pradesh', status: 'live', order: 1,
    tagline: 'Where strangers become family', description: 'Our home in the hills above Manali: a homestay, a cafe and a kitchen that serves Himachali food.',
    address: 'Near Manali strays, Mansari, Haripur, Naggar, Himachal Pradesh 175136', phone: '+91 95958 93320', link: '/stay' },
  { name: 'Kasol', city: 'Kasol', state: 'Himachal Pradesh', status: 'upcoming', order: 2, tagline: 'Opening soon', description: 'Our next home by the Parvati river. Stay tuned.' },
  { name: 'Bir', city: 'Bir', state: 'Himachal Pradesh', status: 'upcoming', order: 3, tagline: 'Opening soon', description: 'Paragliding country is next on our list. Stay tuned.' },
  { name: 'More locations', city: '', state: '', status: 'upcoming', order: 4, tagline: 'Coming soon', description: 'More Hi Strangers homes are on the way. Follow us to know first.' },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_site');
  let added = 0;
  for (const l of locations) {
    const r = await Location.updateOne({ name: l.name }, { $setOnInsert: l }, { upsert: true });
    added += r.upsertedCount;
  }
  console.log(`Locations: ${added} added, ${locations.length - added} already there`);
  if (!(await TeamMember.countDocuments())) {
    await TeamMember.create({ name: 'Founder', role: 'Founder & Host', bio: 'Come as a stranger, leave with memories. Edit this card in Admin > Leadership.', order: 1 });
    console.log('Added 1 sample leadership card. Edit it in Admin > Leadership');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
