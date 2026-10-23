const express = require('express');
const store = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const mode = req.query.mode;
  let list = store.conversations().filter((c) => c.userId === req.user.id);
  if (mode) list = list.filter((c) => c.mode === mode);
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  res.json({
    success: true,
    conversations: list.map((c) => ({
      id: c.id,
      mode: c.mode,
      title: c.title || 'Conversation',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
});

router.get('/:id', authRequired, (req, res) => {
  const conversation = store.conversations().find(
    (c) => c.id === req.params.id && c.userId === req.user.id
  );
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  const messages = store
    .messages()
    .filter((m) => m.conversationId === conversation.id)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  res.json({ success: true, conversation, messages });
});

module.exports = router;
