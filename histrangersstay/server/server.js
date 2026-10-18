require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

const app = express();

// Trust proxy when running behind Vercel's proxy.
app.set('trust proxy', 1);

// CORS configuration.
// CLIENT_URL = your live site(s), comma separated, no trailing slash, e.g.
//   https://histrangersstay.vercel.app,https://www.yourdomain.com
// A wildcard such as https://*.vercel.app is also accepted (handy for Vercel preview links).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const originAllowed = (origin) => allowedOrigins.some((rule) => {
  if (!rule.includes('*')) return rule === origin;
  const re = new RegExp(`^${rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')}$`, 'i');
  return re.test(origin);
});

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests and tools without an Origin header.
      if (!origin) return callback(null, true);

      if (originAllowed(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Vercel's filesystem is read-only except for /tmp.
// Local development continues to use server/uploads.
const uploadDir = process.env.VERCEL
  ? '/tmp/histrangersstay-uploads'
  : path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

// This is temporary storage on Vercel, not permanent image hosting.
app.use('/uploads', express.static(uploadDir));

// Reuse a pending or successful DB connection within this instance.
let dbPromise;

async function ensureDB() {
  if (!dbPromise) {
    dbPromise = connectDB().catch((error) => {
      // Permit a future invocation to retry after a failed connection.
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

// Turns a database error into a safe, readable hint (never includes the connection string).
function dbHint(message = '') {
  const m = String(message);
  if (/MONGODB_URI is missing/i.test(m)) return 'MONGODB_URI is not set for this deployment. Add it in Vercel > Environment Variables (Production) and redeploy.';
  if (/bad auth|authentication failed/i.test(m)) return 'Atlas rejected the username or password in MONGODB_URI. Check Database Access, then update the variable and redeploy.';
  if (/ENOTFOUND|querySrv|ECONNREFUSED/i.test(m)) return 'The cluster address in MONGODB_URI looks wrong. Copy it again from Atlas > Connect > Drivers.';
  if (/Server selection timed out|IP|whitelist|ReplicaSetNoPrimary/i.test(m)) return 'Atlas is not reachable. In Atlas > Network Access allow 0.0.0.0/0 (Vercel IPs change).';
  if (/Invalid scheme|Invalid connection string|must be in the format/i.test(m)) return 'MONGODB_URI is not a valid connection string. It must start with mongodb+srv:// or mongodb://.';
  return 'Could not connect to the database. See the function logs in Vercel.';
}

// Health endpoint: checks whether the API and database are available.
app.get('/api/health', async (req, res) => {
  try {
    await ensureDB();

    return res.status(200).json({
      ok: true,
      service: 'HisTrangersStay API',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health/database check failed:', error.message);

    return res.status(503).json({
      ok: false,
      message: 'Database unavailable',
      hint: dbHint(error.message),
    });
  }
});

// Basic abuse protection (uses the real client IP via 'trust proxy').
const limiter = (max, windowMs, message) =>
  rateLimit({ windowMs, limit: max, standardHeaders: true, legacyHeaders: false, message: { message } });

const authLimiter = limiter(20, 15 * 60 * 1000, 'Too many attempts. Please try again in a few minutes.');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.post('/api/bookings', limiter(30, 60 * 60 * 1000, 'Too many booking requests. Please try again later.'));

// Ensure the database is connected before running API routes.
app.use('/api', async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);

    res.status(503).json({
      message: 'Database unavailable. Please try again later.',
    });
  }
});

// API routes.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/food', require('./routes/food'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/reviews', require('./routes/reviews'));

// Root endpoint.
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'HisTrangersStay API is running',
    health: '/api/health',
  });
});

// Not found.
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler.
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  return res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Server error',
  });
});

// Vercel imports the Express app as a function.
// Local development starts a normal HTTP server.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;

  ensureDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`API running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('DB connection failed:', error.message);
      process.exit(1);
    });
}

module.exports = app;