import mongoose from 'mongoose';
import config from './config.js';

// Serverless me har request naya connection na banaye — ek promise cache karte hain.
let pending = null;

export function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (pending) return pending;

  if (config.isVercel && /127\.0\.0\.1|localhost/.test(config.mongoUri)) {
    return Promise.reject(
      new Error('MONGO_URI localhost pe set hai. Vercel me MongoDB Atlas ka connection string env var me daalo.')
    );
  }

  mongoose.set('strictQuery', true);
  pending = mongoose
    .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: config.isVercel ? 5 : 10 })
    .then(() => console.log('MongoDB connected:', mongoose.connection.name))
    .catch((e) => {
      pending = null; // agli request me dobara try
      throw e;
    });
  return pending;
}
