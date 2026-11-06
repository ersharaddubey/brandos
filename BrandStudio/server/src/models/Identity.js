import mongoose from 'mongoose';
import { tenantPlugin } from '../middleware/tenant.js';
import { computeLockStats } from '../services/lockSchema.js';
const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['product', 'character', 'environment', 'brand'], required: true },
    description: String,
    referenceAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    profile: { type: Schema.Types.Mixed, default: {} },
    rules: [String],
    anchors: [String], // short unique visual locks (pg4: identityAnchors)
    status: { type: String, enum: ['analyzing', 'draft', 'locked', 'error'], default: 'analyzing' },
    analysisError: String,
    version: { type: Number, default: 1 },
    history: [{ version: Number, profile: Schema.Types.Mixed, rules: [String], anchors: [String], lockPercent: Number, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true, minimize: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Lock % (overall + per group) - list/detail API me automatically aata hai
schema.virtual('lockStats').get(function () { return computeLockStats(this); });

schema.plugin(tenantPlugin);

export default mongoose.model('Identity', schema);
