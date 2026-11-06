import { Router } from 'express';
import Identity from '../models/Identity.js';
import Asset from '../models/Asset.js';
import Generation from '../models/Generation.js';
import PromptTemplate from '../models/PromptTemplate.js';
import { wrap } from '../middleware/common.js';

const r = Router();

r.get('/', wrap(async (req, res) => {
  const [identities, locked, assets, generated, prompts, generations] = await Promise.all([
    Identity.countDocuments(),
    Identity.countDocuments({ status: 'locked' }),
    Asset.countDocuments(),
    Asset.countDocuments({ kind: 'generated' }),
    PromptTemplate.countDocuments(),
    Generation.countDocuments(),
  ]);
  const scored = await Asset.aggregate([{ $match: { kind: 'generated', score: { $ne: null } } }, { $group: { _id: null, avg: { $avg: '$score' } } }]);
  res.json({ identities, locked, assets, generated, prompts, generations, avgScore: scored[0] ? Math.round(scored[0].avg) : null });
}));

export default r;
