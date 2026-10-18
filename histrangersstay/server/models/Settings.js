const mongoose = require('mongoose');

// Single-document site settings: everything shown on the home page, mega menu and footer.
// List fields are stored as plain lines so they stay easy to edit in Admin > Site settings:
//   facilityGroups   "Group name | item, item, item"
//   nearby           "Category | Place | distance"   (or "Place | distance")
//   reviewCategories "Staff | 9.5"
//   reviews          "Guest name | Country | Review text"
//   faqs             "Question | Answer"
const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Hi Strangers Stay' },
  tagline: { type: String, default: 'You come as guest, leave as a friend · Naggar | Manali' },
  heroSubtitle: { type: String, default: 'Stays, stories and bonfires in the Himachal hills. Bike rides, chai mornings and real mountain experiences.' },
  heroImage: { type: String, default: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2400&q=70' },
  about: {
    type: String,
    default: 'Hi Strangers Stay is a hostel in Haripur with a garden and free Wi-Fi. Guests can relax in the lounge, the shared kitchen and the garden.\nBreakfast is served with continental, à la carte, Italian, full English/Irish, vegetarian, gluten-free and Asian options. The rooms have mountain views, a private bathroom with bidet, a terrace or balcony, a work desk and an electric kettle.\nThe property is about 42 km from Kullu–Manali Airport and has free private parking on site.',
  },
  // Home page "Welcome" block (heading line, label and the two photos). Empty = automatic.
  welcomeEyebrow: { type: String, default: 'Welcome' },
  welcomeTitle: { type: String, default: '' },      // empty = "Welcome to <property name>"
  welcomeImage: { type: String, default: '' },      // large photo; empty = first gallery photo
  welcomeImage2: { type: String, default: '' },     // small photo; empty = second gallery photo
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: 'Hi Strangers Stay Manali, Haripur, 175136, Himachal Pradesh, India' },
  mapLink: { type: String, default: 'https://www.google.com/maps/place/Hi+Strangers+Stay+Manali/@32.155137,77.178226,16z' },
  instagram: { type: String, default: 'hi_strangersstay' },
  youtube: { type: String, default: '' },
  checkInTime: { type: String, default: '11:00 AM to 11:00 PM' },
  checkOutTime: { type: String, default: '10:00 AM to 11:00 AM' },
  taxPercent: { type: Number, default: 5, min: 0, max: 40 },

  highlights: {
    type: [String],
    default: () => ['Free Wi-Fi in all areas', 'Free private parking on site', 'Breakfast available', 'Garden, terrace and balcony', 'Shared lounge and shared kitchen', 'Mountain views', 'Pets allowed on request, no extra charge'],
  },


  // ---- Home page, media and extra content (all editable in Admin > Site settings) ----
  announcement: { type: String, default: 'Book directly with us. No online payment needed, you pay at the property.' },
  popupEnabled: { type: Boolean, default: true },
  // "Image URL | Headline | Sub-line"
  heroSlides: {
    type: [String],
    default: () => [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2400&q=70 | You come as a guest, leave as a friend | Mountain-view rooms, garden and chai mornings in the Naggar valley.',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=70 | Wake up to the Himalayas | Terrace, balcony and views that make slow mornings worth it.',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=2400&q=70 | Stories, bonfires and bike rides | Real mountain experiences with people who feel like family.',
    ],
  },
  videoTitle: { type: String, default: 'See the stay in motion' },
  videoText: { type: String, default: 'A quick look at the rooms, the views and the vibe. Paste your YouTube and Instagram links in Admin > Site settings.' },
  youtubeUrls: { type: [String], default: () => [] },
  instagramUrls: { type: [String], default: () => [] },
  // "Image URL | Caption (optional)"
  gallery: {
    type: [String],
    default: () => [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=70 | Valley views',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=70 | Common area',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=70 | Rooms',
    ],
  },
  // "Title | Description | Image URL (optional)"
  experiences: {
    type: [String],
    default: () => [
      'Bike rides | Spontaneous rides through the Naggar valley with local tips from the hosts. |',
      'Hiking and walks | Forest trails, waterfalls and village walks, close to the property. | https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=70',
      'Chai mornings | Slow mornings in the garden with chai, breakfast and mountain views. |',
      'Bonfire and music | Evenings with stories, live music and movie nights in the lounge. |',
    ],
  },
  // "Title | When | Description | Image URL (optional)"
  events: {
    type: [String],
    default: () => [
      'Bonfire nights | Evenings, weather permitting | Gather around the fire with stories, music and fellow travellers from around the world. |',
      'Live music | On selected nights | Acoustic evenings in the lounge. Bring an instrument or just sit back and listen. |',
      'Movie nights | In the shared lounge | Pick a film, grab some chai and settle in with the group. |',
      'Group rides and treks | Ask the hosts | Spontaneous bike rides and forest walks around the Naggar valley, planned with local tips. |',
    ],
  },
  // "Title | Description"
  whyUs: {
    type: [String],
    default: () => [
      'Mountain views | Rooms with a view, plus a terrace, balcony and garden to enjoy it.',
      'Free Wi-Fi and parking | Wi-Fi in all areas and free private parking on site.',
      'Breakfast and shared kitchen | Many breakfast options, and a shared kitchen when you want to cook.',
      'Pay at the property | No online payment. Reserve now and pay when you arrive.',
    ],
  },
  stayIncludes: {
    type: [String],
    default: () => ['Private bathroom with bidet', 'Mountain view', 'Terrace or balcony', 'Free Wi-Fi', 'Work desk', 'Electric kettle'],
  },
  stayInfo: { type: String, default: '' },
  howToReach: { type: String, default: 'The property is in Haripur near Naggar, about 42 km from Kullu-Manali Airport. Free private parking is available on site.' },
  // "page | Heading | Text"  (page = home, stay, about, experiences, gallery, offers, reviews, contact). Use || for a new paragraph.
  customSections: { type: [String], default: () => [] },

  // Guest reviews
  reviewScore: { type: Number, default: 9.2, min: 0, max: 10 },
  reviewLabel: { type: String, default: 'Superb' },
  reviewCount: { type: Number, default: 5, min: 0 },
  reviewCategories: {
    type: [String],
    default: () => ['Staff | 9.5', 'Facilities | 9.5', 'Cleanliness | 9.5', 'Comfort | 9.5', 'Value for money | 9.5', 'Location | 9.0', 'Free Wi-Fi | 10'],
  },
  reviews: {
    type: [String],
    default: () => ['Tomar | India | Loved the ambience of the place and the positive vibes of the hosts and staff. The rooms were spacious and the washrooms squeaky clean. Amazing scenery, full of greenery and mountains.'],
  },
  // Google reviews (shown above admin reviews). Same format: Guest name | Country | Review text
  googleReviews: {
    type: [String],
    default: () => [],
  },

  // Facilities, dining and activities
  facilityGroups: {
    type: [String],
    default: () => [
      'Great for your stay | Balcony, Terrace, Garden, Mountain view, Private bathroom, Shower, Bath, Free Wi-Fi, Free parking, Pets allowed',
      'Bathroom | Private bathroom, Bidet, Toilet, Toilet paper, Towels, Slippers, Free toiletries, Shower, Bath, Towels/sheets (extra fee)',
      'Bedroom | Linen, Wardrobe or closet, Clothes rack',
      'View and outdoors | Mountain view, Terrace, Balcony, Garden',
      'Kitchen | Shared kitchen, Electric kettle',
      'Living area | Desk, Shared lounge/TV area',
      'Internet | Free Wi-Fi in all areas',
      'Parking | Free private parking on site (no reservation needed)',
      'Services | Wake-up service',
      'Entertainment and family | Board games/puzzles, Games room, Movie nights',
      'General | Non-smoking throughout, Soundproof rooms, Heating',
      'Languages spoken | English, Hindi',
    ],
  },
  breakfast: {
    type: [String],
    default: () => ['Continental', 'À la carte', 'Italian', 'Full English/Irish', 'Vegetarian', 'Vegan', 'Gluten-free', 'Asian', 'Breakfast to go'],
  },
  activities: {
    type: [String],
    default: () => ['Hiking', 'Walking tours', 'Bike tours', 'Live music/performance', 'Movie nights', 'Evening entertainment', 'Games room'],
  },

  // Surroundings: "Category | Place | distance"
  nearby: {
    type: [String],
    default: () => [
      "What's nearby | Bana Bihar Manali | 12 km",
      'Restaurants and cafes | Bodh Chinese Dish | 200 m',
      'Restaurants and cafes | Aditya Chinese Dish | 450 m',
      'Restaurants and cafes | Royal Cafe | 750 m',
      'Natural beauty | Baror Parsha Waterfall | 8 km',
      'Closest airport | Kullu–Manali Airport | 41 km',
    ],
  },

  policies: {
    type: [String],
    default: () => [
      'Children of any age are welcome. Guests aged 18 and above are charged as adults',
      'Cots and extra beds are not available',
      'No age requirement for check-in',
      'Pets are allowed on request at no extra charge',
      'Parties and events are not allowed',
      'Non-smoking throughout the property',
    ],
  },
  finePrint: { type: String, default: 'This property will not accommodate hen, stag or similar parties.' },

  faqs: {
    type: [String],
    default: () => [
      'What are the check-in and check-out times? | Check-in is from 11:00 AM to 11:00 PM. Check-out is from 10:00 AM to 11:00 AM.',
      'Is breakfast served? | Yes. Options include continental, à la carte, Italian, full English/Irish, vegetarian, vegan, gluten-free and Asian, and breakfast to go.',
      'Can I park at the property? | Yes. Free private parking is available on site and no reservation is needed.',
      'Is Wi-Fi available? | Yes. Free Wi-Fi is available in all areas.',
      'Are pets allowed? | Pets are allowed on request. There is no extra charge.',
      'Are children allowed? | Children of any age are welcome. Guests aged 18 and above are charged as adults. Cots and extra beds are not available.',
      'Are parties allowed? | No. Parties and events are not allowed, and hen, stag or similar parties cannot be accommodated.',
      'How far is the airport? | Kullu–Manali Airport is about 41 to 42 km from the property.',
    ],
  },
}, { timestamps: true });

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
