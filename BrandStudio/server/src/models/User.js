import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true, select: false }, organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }, role: { type: String, enum: ['owner','admin','member'], default: 'owner' }, status: { type: String, enum: ['active','invited','disabled'], default: 'active' }, emailVerifiedAt: Date, resetTokenHash: String, resetExpiresAt: Date }, { timestamps: true });
schema.index({ organizationId: 1, email: 1 }, { unique: true });
export default mongoose.model('User', schema);
