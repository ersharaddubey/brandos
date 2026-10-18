const express = require('express');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('../utils/asyncH');

const router = express.Router();
const EDITABLE = ['siteName', 'tagline', 'heroSubtitle', 'heroImage', 'about', 'phone', 'whatsapp', 'email', 'address',
  'mapLink', 'instagram', 'youtube', 'welcomeEyebrow', 'welcomeTitle', 'welcomeImage', 'welcomeImage2', 'checkInTime', 'checkOutTime', 'taxPercent', 'highlights', 'nearby', 'policies',
  'reviewScore', 'reviewLabel', 'reviewCount', 'reviewCategories', 'reviews', 'facilityGroups', 'breakfast', 'activities', 'finePrint', 'faqs',
  'announcement', 'popupEnabled', 'heroSlides', 'videoTitle', 'videoText', 'youtubeUrls', 'instagramUrls', 'gallery', 'experiences', 'events', 'whyUs',
  'stayIncludes', 'stayInfo', 'howToReach', 'customSections'];

router.get('/', asyncH(async (req, res) => res.json(await Settings.getSingleton())));

router.put('/', protect, adminOnly, asyncH(async (req, res) => {
  const doc = await Settings.getSingleton();
  EDITABLE.forEach((k) => { if (k in req.body) doc[k] = req.body[k]; });
  await doc.save();
  res.json(doc);
}));

module.exports = router;
