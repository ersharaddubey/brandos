import mongoose from 'mongoose';
const { Schema } = mongoose;

/** Soft-deleted items. Auto-purged after 24 hours. */
const schema = new Schema(
  {
    kind: { type: String, enum: ['asset', 'group', 'identity'], required: true },
    originalId: { type: Schema.Types.ObjectId },
    snapshot: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, default: 'group-delete' },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoTTL when expiresAt passes

export default mongoose.model('RecycleBin', schema);
