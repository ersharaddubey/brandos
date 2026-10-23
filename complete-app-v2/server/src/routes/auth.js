const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const store = require('../db');
const { jwtSecret, accessTokenExpiry, refreshTokenExpiry } = require('../config');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    jwtSecret,
    { expiresIn: accessTokenExpiry }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh', jti: uuidv4() },
    jwtSecret,
    { expiresIn: refreshTokenExpiry }
  );

  const tokens = store.refreshTokens();
  tokens.push({
    token: refreshToken,
    userId: user.id,
    createdAt: Date.now(),
  });
  // keep last 20 per user
  const kept = tokens.filter((t) => t.userId !== user.id).concat(
    tokens.filter((t) => t.userId === user.id).slice(-20)
  );
  store.saveRefreshTokens(kept);

  return { accessToken, refreshToken };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const users = store.users();
    if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const user = {
      id: uuidv4(),
      email: String(email).toLowerCase().trim(),
      name: name || email.split('@')[0],
      passwordHash: await bcrypt.hash(String(password), 10),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    store.saveUsers(users);

    const tokens = issueTokens(user);
    res.json({ success: true, user: publicUser(user), ...tokens });
  } catch (err) {
    console.error('register', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const users = store.users();
    const user = users.find((u) => u.email === String(email).toLowerCase().trim());
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const tokens = issueTokens(user);
    res.json({ success: true, user: publicUser(user), ...tokens });
  } catch (err) {
    console.error('login', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }
    const tokens = store.refreshTokens();
    const stored = tokens.find((t) => t.token === refreshToken);
    if (!stored) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Expired refresh token' });
    }
    const users = store.users();
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    // rotate: remove old refresh token
    store.saveRefreshTokens(tokens.filter((t) => t.token !== refreshToken));
    const next = issueTokens(user);
    res.json({ success: true, ...next });
  } catch (err) {
    console.error('refresh', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    const tokens = store.refreshTokens().filter((t) => t.token !== refreshToken);
    store.saveRefreshTokens(tokens);
  }
  res.json({ success: true });
});

router.get('/me', authRequired, (req, res) => {
  const users = store.users();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user: publicUser(user) });
});

module.exports = router;
