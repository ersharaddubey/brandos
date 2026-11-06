import mongoose from 'mongoose';
import { tenantPlugin } from '../middleware/tenant.js';
const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    goal: String,
    identityIds: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
  },
  { timestamps: true }
);

schema.index({ organizationId: 1, name: 1 }, { unique: true, sparse: true });
schema.plugin(tenantPlugin);

export default mongoose.model('Campaign', schema);
