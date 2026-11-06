import mongoose from 'mongoose';
const schema = new mongoose.Schema({ organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }, email: { type: String, required: true, lowercase: true, trim: true }, role: { type: String, enum: ['admin','member'], default: 'member' }, tokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true }, acceptedAt: Date, invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('Invitation', schema);
