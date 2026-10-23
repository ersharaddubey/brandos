const mongoose = require('mongoose');

// Volunteer / collaboration application. The resume file is stored inside the document (max 2 MB),
// hidden from normal queries and only sent to the admin through GET /api/volunteers/:id/resume.
const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 14, max: 99 },
  email: { type: String, required: true, lowercase: true, trim: true },
  instagram: { type: String, default: '', trim: true },
  youtube: { type: String, default: '', trim: true },
  followers: { type: Number, required: true, min: 5000 },
  skills: { type: String, required: true, trim: true },
  why: { type: String, required: true, trim: true },
  resume: {
    filename: String,
    contentType: String,
    data: { type: Buffer, select: false },
  },
  status: { type: String, enum: ['new', 'shortlisted', 'rejected'], default: 'new' },
}, { timestamps: true });

module.exports = mongoose.model('Volunteer', volunteerSchema);
