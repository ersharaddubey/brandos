import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    goal: String,
    identityIds: [{ type: Schema.Types.ObjectId, ref: 'Identity' }],
  },
  { timestamps: true }
);

export default mongoose.model('Campaign', schema);
