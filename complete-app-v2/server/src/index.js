const http = require('http');
const express = require('express');
const cors = require('cors');
const { port } = require('./config');
const { attachStreamServer } = require('./websocket/stream');

const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plan');
const profileRoutes = require('./routes/profile');
const conversationsRoutes = require('./routes/conversations');
const aiRoutes = require('./routes/ai');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'support-assistant-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/ai', aiRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const server = http.createServer(app);
attachStreamServer(server);

server.listen(port, () => {
  console.log(`🚀 Support Assistant server on http://localhost:${port}`);
  console.log(`   Health:    GET  /health`);
  console.log(`   Auth:      POST /api/auth/register | /login | /refresh`);
  console.log(`   Plan:      GET  /api/plan | POST /api/plan/activate-l1`);
  console.log(`   WebSocket: ws://localhost:${port}/stream?token=...`);
});
