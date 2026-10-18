require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Hotel = require('./models/Hotel');
const Room = require('./models/Room');
const Offer = require('./models/Offer');
const Booking = require('./models/Booking');
const Settings = require('./models/Settings');
const Review = require('./models/Review');
const FoodItem = require('./models/FoodItem');
const foodItems = require('./data-food');

// Sample photos from Unsplash. Replace them from the admin panel with your own property photos.
const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;
const IMG = [
  U('photo-1555854877-bab0e564b8d5'),
  U('photo-1520250497591-112f2f40a3f4'),
  U('photo-1506905925346-21bda4d32df4'),
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_site');
  await Promise.all([User.deleteMany({ role: 'admin' }), Hotel.deleteMany(), Room.deleteMany(), Offer.deleteMany(), Booking.deleteMany(), Settings.deleteMany(), Review.deleteMany(), FoodItem.deleteMany()]);

  const email = process.env.ADMIN_EMAIL || 'admin@hotel.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  await User.create({ name: 'Site Admin', email, password, role: 'admin' });

  // Site settings use the defaults defined in models/Settings.js (edit them later in Admin > Site settings)
  const settings = await Settings.create({});

  // Copy the sample guest reviews from settings into the Review collection (edit them in Admin > Reviews)
  const sampleReviews = (settings.reviews || []).map((line, i) => {
    const p = String(line).split('|').map((x) => x.trim());
    return p.length >= 3
      ? { name: p[0], country: p[1], text: p.slice(2).join(' | '), order: i }
      : { name: p[0], country: '', text: p[1] || '', order: i };
  }).filter((r) => r.name && r.text);
  if (sampleReviews.length) await Review.insertMany(sampleReviews);

  const hotel = await Hotel.create({
    name: 'Hi Strangers Stay Manali',
    city: 'Manali',
    state: 'Himachal Pradesh',
    type: 'Hostel',
    brand: 'Hi Strangers Stay',
    tagline: 'You come as guest, leave as a friend · Naggar near Manali',
    description: 'Hi Strangers Stay in Naggar near Manali. Mountain views, garden, terrace, shared lounge and kitchen. We create moments — spontaneous bike rides, local explorations, peaceful mornings with chai and unreal views. You come as a guest, leave as a friend.',
    images: IMG,
    amenities: ['Free Wi-Fi', 'Garden', 'Terrace and balcony', 'Mountain view', 'Free private parking', 'Shared lounge', 'Shared kitchen', 'Breakfast available', 'Pets on request'],
    rating: 4.6,
    startingPrice: 2300,
    featured: true,
    address: 'Hi Strangers Stay Manali, Haripur, 175136, Himachal Pradesh, India',
  });

  // Room types follow the listing. PRICES ARE PLACEHOLDERS: set your real rates in Admin > Rooms.
  const base = ['Mountain view', 'Private bathroom with bidet', 'Free Wi-Fi'];
  await Room.create([
    { hotel: hotel._id, name: 'Double Room with Mountain View', type: 'Private', description: 'Private room for two guests with a large double bed, a private bathroom and mountain views.', pricePerNight: 2300, maxGuests: 2, size: 200, bedType: '1 large double bed', images: IMG, amenities: base, totalRooms: 3 },
    { hotel: hotel._id, name: 'Family Room with Mountain View', type: 'Private', description: 'Room for up to four guests with one double bed and two futon beds, a private bathroom and mountain views.', pricePerNight: 3200, maxGuests: 4, size: 300, bedType: '1 double bed and 2 futon beds', images: IMG, amenities: base, totalRooms: 2 },
    { hotel: hotel._id, name: 'Quadruple Room with Mountain View', type: 'Private', description: 'Room for up to four guests with two large double beds, a private bathroom and mountain views.', pricePerNight: 3800, maxGuests: 4, size: 320, bedType: '2 large double beds', images: IMG, amenities: base, totalRooms: 2 },
  ]);

  // SAMPLE offers so the home page slider is not empty. Edit or delete them in Admin > Offers.
  const days = (n) => new Date(Date.now() + n * 86400000);
  await Offer.create([
    { title: 'Stay 3 nights, save more', tag: 'Long stay', description: 'Slow down in the mountains. Book three nights or more and enter this code when you reserve.', image: U('photo-1506905925346-21bda4d32df4'), code: 'STAY3', discountPercent: 10, minNights: 3, validTill: days(120) },
    { title: 'Weekday escape', tag: 'Mon to Thu', description: 'Quieter valley, better rates. Valid for stays that check in from Monday to Thursday.', image: U('photo-1555854877-bab0e564b8d5'), code: 'WEEKDAY', discountPercent: 8, weekdaysOnly: true, validTill: days(120) },
    { title: 'Book direct welcome', tag: 'Direct booking', description: 'Reserve on this website and get a welcome chai on arrival.', image: U('photo-1520250497591-112f2f40a3f4'), code: 'HELLO', discountPercent: 0, validTill: days(180) },
  ]);

  await FoodItem.insertMany(foodItems);

  console.log('Seeded 1 property, 3 rooms (placeholder prices), 3 sample offers, a sample food menu and default site settings');
  console.log(`Admin login -> ${email} / ${password}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
