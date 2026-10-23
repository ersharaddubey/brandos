const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const store = require('../db');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    const users = store.users();
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/** Optional: verify token from query string (WebSocket). */
function verifyTokenString(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    const users = store.users();
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}

module.exports = { authRequired, verifyTokenString };
