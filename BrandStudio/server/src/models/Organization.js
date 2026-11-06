import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, lowercase: true }, plan: { type: String, enum: ['free','pro','enterprise'], default: 'free' }, status: { type: String, enum: ['active','suspended'], default: 'active' } }, { timestamps: true });
export default mongoose.model('Organization', schema);
