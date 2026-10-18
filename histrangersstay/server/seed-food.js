// Adds the sample food menu WITHOUT touching rooms, bookings or settings.
// Run: npm run seed:food   (skips if a menu already exists, use --force to replace it)
require('dotenv').config();
const mongoose = require('mongoose');
const FoodItem = require('./models/FoodItem');
const items = require('./data-food');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_site');
  const count = await FoodItem.countDocuments();
  if (count && !process.argv.includes('--force')) {
    console.log(`Menu already has ${count} items. Nothing changed. Use --force to replace it.`);
  } else {
    if (count) await FoodItem.deleteMany();
    await FoodItem.insertMany(items);
    console.log(`Added ${items.length} sample food items`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
