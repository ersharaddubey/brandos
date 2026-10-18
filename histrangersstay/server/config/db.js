const mongoose = require('mongoose');

// Accepts the value exactly as pasted into Vercel / .env, and cleans common paste mistakes:
// spaces or line breaks around it, wrapping quotes, or a leftover "MONGODB_URI=" at the start.
const cleanUri = (raw = '') => String(raw)
  .trim()
  .replace(/^["']|["']$/g, '')
  .trim()
  .replace(/^MONGODB_URI\s*=\s*/i, '')
  .trim();

module.exports = async function connectDB() {
  const uri = cleanUri(process.env.MONGODB_URI || process.env.MONGO_URI);

  if (!uri) {
    throw new Error('MONGODB_URI is missing from environment variables');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('MongoDB connected');
};
