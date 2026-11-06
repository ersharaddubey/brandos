import mongoose from 'mongoose';
import { tenantPlugin } from '../middleware/tenant.js';
const { Schema } = mongoose;

const TYPES = ['product', 'character', 'environment', 'brand'];

const schema = new Schema(
  {
    /** Display name: "{companyName} {type}" */
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    type: { type: String, enum: TYPES, required: true },
    assetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    identityIds: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
    visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
    /** Built-in brandstudio groups — cannot delete */
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ companyName: 1, type: 1 });

schema.plugin(tenantPlugin);

export default mongoose.model('AssetGroup', schema);
