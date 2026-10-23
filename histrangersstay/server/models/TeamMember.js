const mongoose = require('mongoose');

// Leadership / team card. Managed in Admin > Leadership.
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: '', trim: true },
  bio: { type: String, default: '' },
  photo: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  instagram: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamSchema);
