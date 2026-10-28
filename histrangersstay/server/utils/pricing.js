const Offer = require('../models/Offer');
const FoodItem = require('../models/FoodItem');

const DAY = 24 * 60 * 60 * 1000;
const err = (message, status = 400) => Object.assign(new Error(message), { status });

// Checks a coupon code against the booking and returns { offer, discount }.
// Throws an error with a readable message if the code cannot be used.
async function resolveCoupon(rawCode, { subtotal, nights, checkIn }) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  const offer = await Offer.findOne({ code, active: true });
  if (!offer) throw err('This coupon code is not valid');
  if (offer.validTill && new Date(offer.validTill).getTime() < Date.now() - DAY) {
    throw err('This coupon code has expired');
  }
  if (offer.minNights && nights < offer.minNights) {
    throw err(`This code needs a stay of at least ${offer.minNights} nights`);
  }
  if (offer.weekdaysOnly) {
    const dow = new Date(checkIn).getDay(); // 0 Sun ... 6 Sat
    if (dow === 0 || dow === 5 || dow === 6) throw err('This code is valid only for check-in from Monday to Thursday');
  }

  let discount = Math.round(subtotal * ((offer.discountPercent || 0) / 100));
  if (offer.maxDiscount && discount > offer.maxDiscount) discount = offer.maxDiscount;
  if (discount > subtotal) discount = subtotal;
  return { offer, discount };
}

// items: [{ item: foodId, qty }]  ->  priced lines taken from the live menu (never trust client prices)
async function buildFoodLines(items = []) {
  const wanted = new Map();
  (Array.isArray(items) ? items : []).forEach((x) => {
    const id = String(x?.item || x?._id || '');
    const qty = Math.floor(Number(x?.qty));
    if (id && qty > 0) wanted.set(id, Math.min(50, (wanted.get(id) || 0) + qty));
  });
  if (!wanted.size) return [];

  let docs;
  try {
    docs = await FoodItem.find({ _id: { $in: [...wanted.keys()] }, available: true });
  } catch {
    throw err('One of the selected food items is invalid');
  }
  if (docs.length !== wanted.size) throw err('Some food items are no longer available. Please refresh the menu.');

  return docs.map((d) => {
    const qty = wanted.get(String(d._id));
    return { item: d._id, name: d.name, category: d.category, veg: d.veg, price: d.price, qty, total: d.price * qty };
  });
}

// Meal plan chosen by key -> priced snapshot taken from the hotel's live plan (never trust client prices).
// Price is per guest per day; days = nights. Returns null when no plan is chosen.
function buildMealPlan(hotel, key, { guests, nights }) {
  const k = String(key || '').trim();
  if (!k || k === 'none') return null;
  const mp = hotel?.mealPlan;
  if (!mp || mp.enabled === false) throw err('Meal plans are not available right now');
  const opt = (mp.options || []).find((o) => o.key === k);
  if (!opt) throw err('The selected meal plan is not available');
  const g = Math.max(1, Math.floor(Number(guests)) || 1);
  const days = Math.max(1, Math.floor(Number(nights)) || 1);
  return {
    key: opt.key, name: opt.name, includes: [...(opt.includes || [])],
    pricePerPerson: opt.price, guests: g, days, total: opt.price * g * days,
  };
}

// Single place where every booking amount is calculated.
function totals({ nightlyRate, nights, discount = 0, food = [], mealTotal = 0, taxPercent = 5 }) {
  const subtotal = nights * nightlyRate;
  const foodTotal = food.reduce((s, l) => s + l.total, 0);
  const taxable = Math.max(0, subtotal - discount) + foodTotal + mealTotal;
  const taxes = Math.round(taxable * (taxPercent / 100));
  return { subtotal, discount, foodTotal, mealTotal, taxPercent, taxes, totalAmount: taxable + taxes };
}

module.exports = { resolveCoupon, buildFoodLines, buildMealPlan, totals, err };
