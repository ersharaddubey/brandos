import mongoose from 'mongoose';
import { tenantPlugin } from '../middleware/tenant.js';
const { Schema } = mongoose;

/** Identity Lock types — used as asset category for grouping */
export const ASSET_CATEGORIES = ['product', 'character', 'environment', 'brand'];

const schema = new Schema(
  {
    kind: { type: String, enum: ['reference', 'generated', 'upload'], default: 'upload' },
    /** One of the Identity Lock types (or empty for uncategorized uploads) */
    category: {
      type: String,
      enum: ['product', 'character', 'environment', 'brand', ''],
      default: '',
      index: true,
    },
    filename: { type: String, required: true },
    /** Permanent Cloudinary copy (local uploads/ is only a cache) */
    imageUrl: String,
    imageFileId: String, // Cloudinary public_id
    sha256: { type: String, required: true },
    dhash: String,
    size: Number,
    width: Number,
    height: Number,
    identityIds: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    generationId: { type: Schema.Types.ObjectId, ref: 'Generation' },
    prompt: String,
    searchText: { type: String, default: '', index: true },
    embedding: { type: [Number], default: undefined },
    score: Number,
    similarTo: { type: Schema.Types.ObjectId, ref: 'Asset' },
    tags: [String],
    /** private = Asset Bank · public = Open Shelf */
    visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
  },
  { timestamps: true }
);

schema.virtual('url').get(function () {
  return this.imageUrl || `/uploads/${this.filename}`;
});
schema.set('toJSON', { virtuals: true });
schema.set('toObject', { virtuals: true });

schema.index({ organizationId: 1, sha256: 1 }, { unique: true, sparse: true });
schema.plugin(tenantPlugin);

export default mongoose.model('Asset', schema);
