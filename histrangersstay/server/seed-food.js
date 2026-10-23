// Adds / updates the food menu WITHOUT touching rooms, bookings or settings.
//
//   npm run seed:food                  -> adds missing items, updates price/veg/category of existing ones (same name + category)
//   npm run seed:food -- --hide-old    -> same, and also hides items that are not in data-food.js (old sample items, bookings keep working)
//   npm run seed:food -- --replace     -> deletes the whole menu first, then adds data-food.js (old bookings lose their link to dishes)
require('dotenv').config();
const mongoose = require('mongoose');
const FoodItem = require('./models/FoodItem');
const items = require('./data-food');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_site');

  if (process.argv.includes('--replace') || process.argv.includes('--force')) {
    await FoodItem.deleteMany();
    await FoodItem.insertMany(items.map((i) => ({ ...i, available: true })));
    console.log(`Menu replaced: ${items.length} items added`);
  } else {
    const res = await FoodItem.bulkWrite(items.map((i) => ({
      updateOne: {
        filter: { name: i.name, category: i.category },
        update: { $set: { price: i.price, veg: i.veg, order: i.order, available: true } },
        upsert: true,
      },
    })));
    console.log(`Menu synced: ${res.upsertedCount} added, ${res.modifiedCount} updated, ${items.length} total in data-food.js`);

    if (process.argv.includes('--hide-old')) {
      const keep = items.map((i) => `${i.category}||${i.name}`);
      const all = await FoodItem.find({ available: true }, 'name category');
      const old = all.filter((d) => !keep.includes(`${d.category}||${d.name}`)).map((d) => d._id);
      if (old.length) await FoodItem.updateMany({ _id: { $in: old } }, { $set: { available: false } });
      console.log(`Hidden ${old.length} old items (they are still in Admin > Food menu, just not shown to guests)`);
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
