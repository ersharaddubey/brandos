const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const asyncH = require('./asyncH');

// Generic CRUD router: public list, admin list, create, update, delete
module.exports = (Model, { populate = '', publicFilter = () => ({}), publicQuery = () => ({}), sort = { createdAt: -1 }, canCreate = null, canDelete = null } = {}) => {
  const r = express.Router();
  const withPop = (q) => (populate ? q.populate(populate) : q);

  r.get('/', asyncH(async (req, res) => {
    const filter = { ...publicFilter(), ...publicQuery(req.query) };
    res.json(await withPop(Model.find(filter).sort(sort)));
  }));

  r.get('/admin/all', protect, adminOnly, asyncH(async (req, res) => {
    res.json(await withPop(Model.find().sort(sort)));
  }));

  r.post('/', protect, adminOnly, asyncH(async (req, res) => {
    if (canCreate && !(await canCreate())) return res.status(403).json({ message: 'Only one is allowed. Edit the existing one instead.' });
    const doc = await Model.create(req.body);
    res.status(201).json(doc);
  }));

  r.put('/:id', protect, adminOnly, asyncH(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  }));

  r.delete('/:id', protect, adminOnly, asyncH(async (req, res) => {
    if (canDelete && !(await canDelete())) return res.status(403).json({ message: 'This cannot be deleted.' });
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  }));

  return r;
};
