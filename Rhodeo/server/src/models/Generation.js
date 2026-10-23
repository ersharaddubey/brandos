import mongoose from 'mongoose';
const { Schema } = mongoose;

const attempt = new Schema(
  {
    n: Number,
    seed: Number,
    width: Number,
    height: Number,
    prompt: String,
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    score: Number, // 0-100, null = unchecked
    mismatches: [String],
    suggestions: [String],
    checks: [{ identityId: Schema.Types.ObjectId, name: String, score: Number }],
    note: String,
    error: String,
    cancelRequested: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 1 },
  },
  { _id: false }
);

const schema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    identityIds: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
    inputs: {
      goal: String,
      scene: String,
      composition: String,
      style: String,
      templateId: String,
      aspectRatio: String,
      width: Number,
      height: Number,
      avoid: String,
    },
    settings: { maxAttempts: { type: Number, default: 3 }, threshold: { type: Number, default: 75 } },
    status: { type: String, enum: ['queued', 'running', 'done', 'error', 'cancelled'], default: 'running' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentStep: { type: String, default: 'queued' },
    startedAt: Date,
    completedAt: Date,
    attempts: [attempt],
    bestAttempt: Number,
    error: String,
    cancelRequested: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model('Generation', schema);
