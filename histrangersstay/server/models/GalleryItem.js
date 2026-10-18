const mongoose = require('mongoose');

const GalleryItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: null }, // Cloudinary id, used to delete the file too
  caption: { type: String, default: '', maxlength: 200 },
  size: { type: String, enum: ['auto', 'small', 'wide', 'tall', 'large'], default: 'auto' },
  order: { type: Number, default: 0, index: true },
}, { timestamps: true });

module.exports = mongoose.model('GalleryItem', GalleryItemSchema);
