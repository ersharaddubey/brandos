require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Satellite, Waitlist } = require('./models');
const app = express(); app.use(cors(), express.json());

const sign = u => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const auth = roles => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    if (roles && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch { res.status(401).json({ error: 'Please log in' }); }
};
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(400).json({ error: e.code === 11000 ? 'Already exists' : e.message }));
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) throw new Error('Name, email and 6+ char password required');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: pub(u) });
}));
app.get('/api/auth/me', auth(), wrap(async (req, res) => res.json(pub(await User.findById(req.user.id)))));

app.post('/api/waitlist', wrap(async (req, res) => {
  if (!/^\S+@\S+\.\S+$/.test(req.body.email || '')) throw new Error('Enter a valid email');
  await Waitlist.create({ email: req.body.email, type: req.body.type });
  res.json({ ok: true });
}));
app.get('/api/waitlist', auth(['admin']), wrap(async (_, res) => res.json(await Waitlist.find().sort('-createdAt'))));

app.get('/api/satellites', auth(), wrap(async (_, res) => res.json(await Satellite.find())));
app.post('/api/satellites', auth(['admin']), wrap(async (req, res) => res.json(await Satellite.create(req.body))));

// Simulated telemetry. Replace with real operator feed / Celestrak-based propagation.
const R = 6371, MU = 398600.4418;
function telemetry(s) {
  const t = Date.now() / 1000, a = R + s.altitudeKm, period = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
  const ph = (t % period) / period * 2 * Math.PI, sunlit = Math.sin(ph) > -0.3, j = k => Math.sin(t / k);
  return {
    time: new Date().toISOString(),
    lat: +(s.inclination * Math.sin(ph)).toFixed(2), lon: +(((t / 240 + ph * 57.3) % 360) - 180).toFixed(2),
    altitudeKm: +(s.altitudeKm + j(40) * 1.5).toFixed(1), velocityKms: +Math.sqrt(MU / a).toFixed(2),
    inclination: s.inclination, periodMin: +(period / 60).toFixed(1),
    solarW: Math.round(sunlit ? 410 + j(7) * 18 : 0), batteryPct: Math.round(sunlit ? 78 + j(50) * 10 : 55 + j(50) * 6),
    reactionWheelRpm: Math.round(3200 + j(11) * 140), utilizationPct: Math.round(86 + j(30) * 4),
    revenuePerHour: Math.round(s.revenuePerHour * (0.95 + 0.05 * j(20))), downlinkGB: +(3.2 + j(15) * 0.4).toFixed(1),
    lifespanYears: s.lifespanYears, status: sunlit ? 'Nominal' : 'Eclipse'
  };
}
app.get('/api/satellites/:id/telemetry', auth(), wrap(async (req, res) => {
  const s = await Satellite.findById(req.params.id);
  if (!s) return res.status(404).json({ error: 'Satellite not found' });
  res.json(telemetry(s));
}));

mongoose.connect(process.env.MONGO_URI).then(() =>
  app.listen(process.env.PORT || 5000, () => console.log('CosmoLive API running'))
).catch(e => { console.error('Mongo connection failed:', e.message); process.exit(1); });
