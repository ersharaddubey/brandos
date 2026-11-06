import { Router } from 'express';
import PromptTemplate from '../models/PromptTemplate.js';
import { wrap } from '../middleware/common.js';

const r = Router();

r.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.visibility === 'public' || req.query.visibility === 'private') {
    filter.visibility = req.query.visibility;
  }
  res.json(await PromptTemplate.find(filter).sort('-updatedAt'));
}));

r.get('/:id', wrap(async (req, res) => {
  const doc = await PromptTemplate.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Prompt not found' });
  res.json(doc);
}));

r.post('/', wrap(async (req, res) => {
  const { name, body, tags = [], note, visibility } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'name and body are required' });
  const vis = visibility === 'public' ? 'public' : 'private';
  res.status(201).json(
    await PromptTemplate.create({
      name,
      tags,
      visibility: vis,
      versions: [{ version: 1, body, note }],
    })
  );
}));

// New version (history is never overwritten)
r.post('/:id/versions', wrap(async (req, res) => {
  const doc = await PromptTemplate.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Prompt not found' });
  if (!req.body.body) return res.status(400).json({ error: 'body is required' });
  const next = Math.max(...doc.versions.map((v) => v.version)) + 1;
  doc.versions.push({ version: next, body: req.body.body, note: req.body.note });
  doc.currentVersion = next;
  await doc.save();
  res.json(doc);
}));

r.post('/:id/current/:version', wrap(async (req, res) => {
  const doc = await PromptTemplate.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Prompt not found' });
  const v = Number(req.params.version);
  if (!doc.versions.some((x) => x.version === v)) return res.status(404).json({ error: 'Version not found' });
  doc.currentVersion = v;
  await doc.save();
  res.json(doc);
}));

r.patch('/:id/visibility', wrap(async (req, res) => {
  const vis = req.body.visibility === 'public' ? 'public' : 'private';
  const doc = await PromptTemplate.findByIdAndUpdate(req.params.id, { visibility: vis }, { new: true });
  if (!doc) return res.status(404).json({ error: 'Prompt not found' });
  res.json(doc);
}));

r.delete('/:id', wrap(async (req, res) => {
  await PromptTemplate.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
