// Fallback values used only until the API responds (or if it is down).
// The real values live in the database and are edited in Admin > Site settings.
export const DEFAULTS = {
  siteName: 'Hi Strangers Stay',
  tagline: 'A quiet stay in the Naggar valley, near Manali',
  heroSubtitle: '',
  heroImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2400&q=70',
  about: '',
  welcomeEyebrow: 'Welcome',
  welcomeTitle: '',
  welcomeImage: '',
  welcomeImage2: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  mapLink: '',
  instagram: 'hi_strangersstay',
  youtube: '',
  checkInTime: '',
  checkOutTime: '',
  taxPercent: 5,
  highlights: [],
  nearby: [],
  policies: [],
  reviewScore: 0,
  reviewLabel: '',
  reviewCount: 0,
  reviewCategories: [],
  reviews: [],
  googleReviews: [],
  facilityGroups: [],
  breakfast: [],
  activities: [],
  finePrint: '',
  faqs: [],
  announcement: '',
  popupEnabled: true,
  heroSlides: [],
  videoTitle: 'See the stay in motion',
  videoText: '',
  youtubeUrls: [],
  instagramUrls: [],
  gallery: [],
  experiences: [],
  events: [],
  whyUs: [],
  stayIncludes: [],
  stayInfo: '',
  howToReach: '',
  customSections: [],
};

// Exact spot of the property on Google Maps (used for the embedded map and directions)
export const PLACE = {
  lat: 32.1551371,
  lng: 77.1782264,
  url: 'https://www.google.com/maps/place/Hi+Strangers+Stay+Manali/@32.155137,77.178226,16z',
};
export const mapEmbed = `https://www.google.com/maps?q=${PLACE.lat},${PLACE.lng}&z=16&output=embed`;
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${PLACE.lat},${PLACE.lng}`;

export const igUrl = (h) => `https://www.instagram.com/${String(h || '').replace(/^@/, '').replace(/\/$/, '')}/`;
export const waUrl = (n) => `https://wa.me/${String(n || '').replace(/\D/g, '')}`;
export const ytUrl = (h) => {
  const v = String(h || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://www.youtube.com/@${v.replace(/^@/, '')}`;
};
