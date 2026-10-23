const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../db');
const { authRequired } = require('../middleware/auth');
const { getPlan } = require('./plan');
const { generateAnswer } = require('../services/ai');

const router = express.Router();

function ensureConversation(userId, conversationId, mode) {
  const conversations = store.conversations();
  if (conversationId) {
    const existing = conversations.find((c) => c.id === conversationId && c.userId === userId);
    if (existing) return existing;
  }
  const c = {
    id: uuidv4(),
    userId,
    mode: mode || 'mixed',
    title: 'Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  conversations.push(c);
  store.saveConversations(conversations);
  return c;
}

function appendMessage(conversationId, role, content, meta = {}) {
  const messages = store.messages();
  const msg = {
    id: uuidv4(),
    conversationId,
    role,
    content,
    ...meta,
    createdAt: Date.now(),
  };
  messages.push(msg);
  store.saveMessages(messages);

  const conversations = store.conversations();
  const c = conversations.find((x) => x.id === conversationId);
  if (c) {
    c.updatedAt = Date.now();
    if (role === 'user' && content && (!c.title || c.title === 'Conversation')) {
      c.title = String(content).slice(0, 80);
    }
    store.saveConversations(conversations);
  }
  return msg;
}

router.post('/text', authRequired, async (req, res) => {
  try {
    const plan = getPlan(req.user.id);
    if (!plan || plan.status !== 'active') {
      return res.status(403).json({ success: false, error: 'PLAN_REQUIRED' });
    }
    const { question, conversationId } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, error: 'question required' });
    }
    const conv = ensureConversation(req.user.id, conversationId, 'text');
    appendMessage(conv.id, 'user', String(question).trim());

    const result = await generateAnswer(req.user.id, String(question).trim(), 'text');
    appendMessage(conv.id, 'assistant', result.answer, {
      provider: result.provider,
      model: result.model,
    });

    res.json({
      success: true,
      question: String(question).trim(),
      answer: result.answer,
      provider: result.provider,
      model: result.model,
      conversationId: conv.id,
    });
  } catch (err) {
    console.error('ai/text', err);
    res.status(500).json({ success: false, error: err.message || 'AI failed' });
  }
});

router.post('/screenshot', authRequired, async (req, res) => {
  try {
    const plan = getPlan(req.user.id);
    if (!plan || plan.status !== 'active') {
      return res.status(403).json({ success: false, error: 'PLAN_REQUIRED' });
    }
    const { image, question, conversationId } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: 'image required' });
    }
    const conv = ensureConversation(req.user.id, conversationId, 'screenshot');
    const q =
      (question && String(question).trim()) ||
      'Describe this screenshot and suggest what to say or do next in a support/interview context.';
    appendMessage(conv.id, 'user', q, { hasImage: true });

    // Vision-capable path is provider-dependent; for now use text prompt.
    const result = await generateAnswer(
      req.user.id,
      `${q}\n\n(A screenshot was attached; respond as if you can see a typical app/code UI.)`,
      'screenshot'
    );
    appendMessage(conv.id, 'assistant', result.answer, {
      provider: result.provider,
      model: result.model,
    });

    res.json({
      success: true,
      question: q,
      answer: result.answer,
      provider: result.provider,
      model: result.model,
      conversationId: conv.id,
    });
  } catch (err) {
    console.error('ai/screenshot', err);
    res.status(500).json({ success: false, error: err.message || 'AI failed' });
  }
});

module.exports = router;
module.exports.ensureConversation = ensureConversation;
module.exports.appendMessage = appendMessage;
