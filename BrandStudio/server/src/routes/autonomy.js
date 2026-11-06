import { Router } from 'express';
import mongoose from 'mongoose';
import { wrap } from '../middleware/common.js';
import { tenantPlugin, currentTenantId } from '../middleware/tenant.js';

const r = Router();

// The OS stores proposals and approvals. It deliberately does not execute arbitrary
// agent code, shell commands, payments, deployments, or external messages.
const agentSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['ready', 'paused'], default: 'ready' },
  createdAt: { type: Date, default: Date.now },
});
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 160 },
  objective: { type: String, required: true, maxlength: 3000 },
  agentKey: { type: String, required: true },
  risk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['proposed', 'approved', 'rejected'], default: 'proposed' },
  approvalNote: { type: String, default: '' },
  createdBy: { type: String, default: 'owner' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const eventSchema = new mongoose.Schema({
  type: String, message: String, taskId: String, actor: String,
  createdAt: { type: Date, default: Date.now },
});
agentSchema.index({ organizationId: 1, key: 1 }, { unique: true, partialFilterExpression: { organizationId: { $exists: true } } });
for (const schema of [agentSchema, taskSchema, eventSchema]) schema.plugin(tenantPlugin);
const Agent = mongoose.models.AutonomyAgent || mongoose.model('AutonomyAgent', agentSchema);
const Task = mongoose.models.AutonomyTask || mongoose.model('AutonomyTask', taskSchema);
const Event = mongoose.models.AutonomyEvent || mongoose.model('AutonomyEvent', eventSchema);

const defaults = [
  ['ceo', 'AI CEO', 'Strategy', 'Turns company goals into prioritized, reviewable plans.'],
  ['research', 'Research Agent', 'Research', 'Researches markets, competitors and product opportunities.'],
  ['product', 'Product Agent', 'Product', 'Converts customer problems into product specifications.'],
  ['engineering', 'Engineering Agent', 'Engineering', 'Plans code changes and prepares implementation tasks.'],
  ['marketing', 'Marketing Agent', 'Marketing', 'Drafts campaigns, content calendars and experiments.'],
  ['sales', 'Sales Agent', 'Sales', 'Organizes leads and drafts outreach for owner review.'],
  ['support', 'Support Agent', 'Customer support', 'Classifies support issues and drafts responses.'],
  ['finance', 'Finance Analyst', 'Finance', 'Tracks costs and proposes budget optimizations.'],
];
let agentIndexReady;
async function ensureAgentIndexes() {
  if (!agentIndexReady) agentIndexReady = (async () => {
    // Older installs created a global unique { key: 1 } index. It prevents
    // each organization from having its own built-in "ceo" agent.
    const indexes = await Agent.collection.indexes().catch(() => []);
    const legacy = indexes.find((index) => index.name === 'key_1' && index.unique && Object.keys(index.key || {}).length === 1 && index.key.key === 1);
    if (legacy) await Agent.collection.dropIndex('key_1');
    await Agent.collection.createIndex(
      { organizationId: 1, key: 1 },
      { unique: true, name: 'organizationId_1_key_1', partialFilterExpression: { organizationId: { $exists: true } } }
    );
  })().catch((error) => { agentIndexReady = null; throw error; });
  return agentIndexReady;
}
async function seedAgents() {
  await ensureAgentIndexes();
  const organizationId = currentTenantId();
  for (const [key, name, role, description] of defaults) {
    const filter = organizationId ? { key, organizationId } : { key, organizationId: { $exists: false } };
    const update = { $setOnInsert: { key, name, role, description, ...(organizationId ? { organizationId } : {}) } };
    try {
      await Agent.updateOne(filter, update, { upsert: true, skipTenantScope: true });
    } catch (error) {
      // Concurrent first requests can race on the compound unique index.
      if (error?.code !== 11000) throw error;
      await Agent.updateOne(filter, { $setOnInsert: update.$setOnInsert }, { upsert: false, skipTenantScope: true });
    }
  }
}
const log = (type, message, taskId = '') => Event.create({ type, message, taskId, actor: 'owner' });

r.get('/', wrap(async (_req, res) => {
  await seedAgents();
  const [agents, tasks, events, proposed, approved, rejected] = await Promise.all([
    Agent.find().sort({ createdAt: 1 }).lean(),
    Task.find().sort({ createdAt: -1 }).limit(50).lean(),
    Event.find().sort({ createdAt: -1 }).limit(20).lean(),
    Task.countDocuments({ status: 'proposed' }),
    Task.countDocuments({ status: 'approved' }),
    Task.countDocuments({ status: 'rejected' }),
  ]);
  res.json({
    mode: 'human-approval',
    executionEnabled: false,
    agents, tasks, events,
    counts: { agents: agents.length, proposed, approved, rejected },
    policy: [
      'No autonomous spending or financial transfers.',
      'No self-deployment, self-replication or arbitrary code execution.',
      'External messages and production changes require human review.',
      'Approval records intent only; execution adapters must be explicitly configured.',
    ],
  });
}));

r.post('/tasks', wrap(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const objective = String(req.body?.objective || '').trim();
  const agentKey = String(req.body?.agentKey || 'ceo').trim();
  const risk = ['low', 'medium', 'high'].includes(req.body?.risk) ? req.body.risk : 'medium';
  if (!title || !objective) return res.status(400).json({ error: 'Title and objective are required.' });
  const agent = await Agent.findOne({ key: agentKey, status: 'ready' });
  if (!agent) return res.status(400).json({ error: 'Choose an available agent.' });
  const task = await Task.create({ title, objective, agentKey, risk, createdBy: req.user || 'owner' });
  await log('task.proposed', `Task proposed: ${title}`, String(task._id));
  res.status(201).json({ task });
}));

r.post('/tasks/:id/approve', wrap(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (task.status !== 'proposed') return res.status(409).json({ error: 'Only proposed tasks can be approved.' });
  task.status = 'approved';
  task.approvalNote = String(req.body?.note || '').slice(0, 1000);
  task.updatedAt = new Date();
  await task.save();
  await log('task.approved', `Owner approved: ${task.title}. Approval does not execute the task.`, String(task._id));
  res.json({ task, executionStarted: false });
}));

r.post('/tasks/:id/reject', wrap(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (task.status !== 'proposed') return res.status(409).json({ error: 'Only proposed tasks can be rejected.' });
  task.status = 'rejected';
  task.approvalNote = String(req.body?.note || '').slice(0, 1000);
  task.updatedAt = new Date();
  await task.save();
  await log('task.rejected', `Owner rejected: ${task.title}`, String(task._id));
  res.json({ task });
}));

r.post('/agents/:key/pause', wrap(async (req, res) => {
  const agent = await Agent.findOneAndUpdate({ key: req.params.key }, { status: 'paused' }, { new: true });
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  await log('agent.paused', `${agent.name} paused`);
  res.json({ agent });
}));

r.post('/agents/:key/resume', wrap(async (req, res) => {
  const agent = await Agent.findOneAndUpdate({ key: req.params.key }, { status: 'ready' }, { new: true });
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  await log('agent.resumed', `${agent.name} resumed`);
  res.json({ agent });
}));

export default r;
