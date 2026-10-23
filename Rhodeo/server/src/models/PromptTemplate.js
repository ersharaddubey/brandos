import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tags: [String],
    currentVersion: { type: Number, default: 1 },
    versions: [{ version: Number, body: String, note: String, createdAt: { type: Date, default: Date.now } }],
    /** private = Prompt OS only · public = Public Bank */
    visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('PromptTemplate', schema);
