import { Router } from 'express';
import Asset from '../models/Asset.js';
import RecycleBin from '../models/RecycleBin.js';
import { wrap, upload } from '../middleware/common.js';
import { ingestImage, removeAssetFile, readAssetBuffer } from '../services/assets.js';
import sharp from 'sharp';
import { inpaintWithA1111 } from '../services/a1111.js';
import { hamming } from '../services/hash.js';
import config from '../config.js';
import { embedText, cosine, lexicalScore } from '../services/embedding.js';
import Identity from '../models/Identity.js';
import { buildAssetSearchText } from '../services/searchText.js';
import { searchAssetVectors, syncAssetPayload, deleteAssetVector, upsertAssetVector } from '../services/qdrant.js';

const r = Router();
const CATS = ['product', 'character', 'environment', 'brand'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Add a small, query-dependent boost to assets linked to a matching identity.
 * Reference status alone never grants a boost.
 */

function detectQueryIdentityType(query, requestedCategory) {
  const validTypes = new Set([
    'product', 'character', 'environment', 'brand'
  ]);

  if (validTypes.has(String(requestedCategory || '').toLowerCase())) {
    return requestedCategory.toLowerCase();
  }

  const text = String(query || '').toLowerCase();

  const keywords = {
    character: /\b(man|woman|person|people|face|beard|glasses|sweater|shirt|wearing|portrait|character)\b/g,
    product: /\b(product|device|gadget|bottle|massage|charger|headphones|packaging|silicone|stainless steel)\b/g,
    environment: /\b(room|interior|bookshelf|shelf|sofa|curtains|furniture|living room|bedroom|landscape|environment|lighting|plants)\b/g,
    brand: /\b(brand|logo|wordmark|company|trademark|brand identity)\b/g
  };

  const scores = Object.entries(keywords).map(([type, regex]) => ({
    type,
    score: [...text.matchAll(regex)].length
  })).sort((a, b) => b.score - a.score);

  if (!scores[0]?.score) return null;
  if (scores[0].score === scores[1]?.score) return null;

  return scores[0].type;
}

async function applyIdentityAwareRanking(assets, query, requestedCategory) {
  if (!assets.length || !query.trim()) return assets;

  const queryType = detectQueryIdentityType(query, requestedCategory);

  // If the query's identity type is unclear, don't apply identity boosts.
  if (!queryType) {
    return assets.map((asset) => ({
      ...asset,
      identityBoost: 0,
      matchedIdentities: []
    }));
  }

  const assetIds = assets.map((asset) => asset._id).filter(Boolean);
  const linkedIdentityIds = [
    ...new Set(assets.flatMap((asset) =>
      (asset.identityIds || []).map(String)
    ))
  ];

  const identities = await Identity.find({
    type: queryType,
    $or: [
      { _id: { $in: linkedIdentityIds } },
      { referenceAssetIds: { $in: assetIds } }
    ]
  }).select(
    'name type description anchors rules status referenceAssetIds'
  ).lean();

  const genericValues = new Set([
    'p', 'cg', 'ss', 'sss', 'ssss', 'ddd', 'dsd',
    'product', 'character', 'environment', 'brand',
    'new identity', 'unknown', 'none', 'test', 'na', 'n/a',
    'char', 'bath', 'yes', 'no'
  ]);

  const meaningful = (value, minLength = 3) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length < minLength) return '';
    if (genericValues.has(text.toLowerCase())) return '';
    return text;
  };

  const boostsByAsset = new Map();
  const assetIdSet = new Set(assetIds.map(String));

  for (const identity of identities) {
    const status = String(identity.status || '').toLowerCase();
    if (status === 'error') continue;

    const name = meaningful(identity.name);
    const description = meaningful(identity.description, 16);
    const anchors = (identity.anchors || [])
      .map((value) => meaningful(value, 5))
      .filter(Boolean);
    const rules = (identity.rules || [])
      .map((value) => meaningful(value, 8))
      .filter(Boolean);

    const identityText = [
      name,
      description,
      ...anchors,
      ...rules
    ].filter(Boolean).join(' ');

    if (!identityText) continue;

    const match = lexicalScore(query, identityText);

    const statusWeight = status === 'locked'
      ? 1
      : status === 'draft'
        ? 0.45
        : status === 'analyzing'
          ? 0.25
          : 0;

    if (!statusWeight) continue;

    // Keep valid identity labels for linked assets even when wording differs.
    // Apply a relevance boost only when the identity text matches the query.
    const boost = match >= 0.10
      ? Math.min(0.06, match * 0.08) * statusWeight
      : 0;

    const linkedAssetIds = new Set([
      ...(identity.referenceAssetIds || []).map(String),
      ...assets
        .filter((asset) =>
          (asset.identityIds || []).some(
            (id) => String(id) === String(identity._id)
          )
        )
        .map((asset) => String(asset._id))
    ]);

    for (const assetId of linkedAssetIds) {
      if (!assetIdSet.has(assetId)) continue;

      const previous = boostsByAsset.get(assetId) || {
        boost: 0,
        identityNames: []
      };

      if (boost > previous.boost) previous.boost = boost;
      const displayName = name || `${identity.type || 'asset'} identity`;
      previous.identityNames.push(displayName);
      boostsByAsset.set(assetId, previous);
    }
  }

  return assets.map((asset) => {
    const match = boostsByAsset.get(String(asset._id));

    if (!match) {
      return {
        ...asset,
        identityBoost: 0,
        matchedIdentities: []
      };
    }

    return {
      ...asset,
      relevance: Number(
        Math.min(1, (asset.relevance || 0) + match.boost).toFixed(4)
      ),
      identityBoost: Number(match.boost.toFixed(4)),
      matchedIdentities: [...new Set(match.identityNames)]
    };
  });
}

/** List assets (Asset Bank = private, Public Assets = public). Supports ?visibility, ?category, ?kind, ?q, ?limit */
r.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.visibility === 'public' || req.query.visibility === 'private') {
    filter.visibility = req.query.visibility;
  }
  if (req.query.kind) filter.kind = String(req.query.kind);

  const and = [];

  if (req.query.category && CATS.includes(req.query.category)) {
    // Category can come from Asset.category or from a linked identity of that type
    const identities = await Identity.find({ type: req.query.category }).select('_id referenceAssetIds').lean();
    const identityIds = identities.map((i) => i._id);
    const refAssetIds = identities.flatMap((i) => i.referenceAssetIds || []);
    and.push({
      $or: [
        { category: req.query.category },
        ...(identityIds.length ? [{ identityIds: { $in: identityIds } }] : []),
        ...(refAssetIds.length ? [{ _id: { $in: refAssetIds } }] : []),
      ],
    });
  }

  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ filename: rx }, { prompt: rx }, { searchText: rx }, { tags: rx }] });
  }
  if (and.length) filter.$and = and;

  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const items = await Asset.find(filter).select('-embedding').sort('-createdAt').limit(limit);
  res.json(items);
}));

/** Re-create embeddings for assets that don't have one yet. */
r.post('/reindex', wrap(async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.body?.limit) || 100));
  const todo = await Asset.find({ $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] })
    .sort('-createdAt')
    .limit(limit);
  let indexed = 0;
  for (const a of todo) {
    const text = a.searchText || buildAssetSearchText({ filename: a.filename, kind: a.kind, category: a.category, prompt: a.prompt, tags: a.tags }, []);
    const vec = await embedText(text);
    if (!vec) continue;
    a.searchText = text;
    a.embedding = vec;
    await a.save();
    try { await upsertAssetVector(a, vec); } catch (e) { console.warn('Qdrant reindex failed:', e.message); }
    indexed++;
  }
  res.json({ checked: todo.length, indexed });
}));

/** Semantic search: Ollama embeddings when supported; lexical relevance fallback otherwise. */
r.get('/search', wrap(async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json([]);

  const filter = {};
  if (req.query.visibility === 'public' || req.query.visibility === 'private') {
    filter.visibility = req.query.visibility;
  }
  if (req.query.category && CATS.includes(req.query.category)) {
    filter.category = req.query.category;
  }
  if (req.query.kind) filter.kind = req.query.kind;

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const queryVector = await embedText(query);

  // Category may be defined by a linked identity rather than Asset.category.
  let searchFilter = { ...filter };
  let identityCategoryIds = [];
  let identityCategoryAssetIds = [];

  if (filter.category) {
    const matchingIdentities = await Identity.find({
      type: filter.category,
      status: { $ne: 'error' }
    }).select('_id referenceAssetIds').lean();

    identityCategoryIds = matchingIdentities.map(
      (identity) => String(identity._id)
    );

    identityCategoryAssetIds = [
      ...new Set(matchingIdentities.flatMap(
        (identity) => (identity.referenceAssetIds || []).map(String)
      ))
    ];

    if (identityCategoryIds.length) {
      const linkedAssetIds = await Asset.distinct('_id', {
        identityIds: { $in: identityCategoryIds }
      });

      identityCategoryAssetIds = [
        ...new Set([
          ...identityCategoryAssetIds,
          ...linkedAssetIds.map(String)
        ])
      ];
    }

    delete searchFilter.category;
    searchFilter.$or = [
      { category: filter.category },
      ...(identityCategoryAssetIds.length
        ? [{ _id: { $in: identityCategoryAssetIds } }]
        : []),
      ...(identityCategoryIds.length
        ? [{ identityIds: { $in: identityCategoryIds } }]
        : [])
    ];
  }

  if (queryVector) {
    try {
      const matches = await searchAssetVectors(queryVector, {
        limit: filter.category ? 1000 : limit,
        visibility: filter.visibility,
        category: undefined,
        kind: filter.kind
      });

      if (matches.length || identityCategoryAssetIds.length) {
        const matchById = new Map(
          matches.map((item) => [String(item.assetId), item])
        );
        const ids = [
          ...new Set([
            ...matches.map((item) => String(item.assetId)),
            ...identityCategoryAssetIds
          ])
        ];

        const found = await Asset.find({
          _id: { $in: ids },
          ...searchFilter
        }).lean();

        const ranked = found.map((asset) => {
          const match = matchById.get(String(asset._id));
          const text = asset.searchText ||
            [asset.prompt || '', ...(asset.tags || []), asset.filename || '', asset.category || ''].join(' ');
          const lexical = lexicalScore(query, text);
          const semantic = match
            ? Math.max(0, match.score)
            : queryVector && asset.embedding
              ? Math.max(0, cosine(queryVector, asset.embedding))
              : 0;

          return {
            ...asset,
            relevance: Number((semantic * 0.8 + lexical * 0.2).toFixed(4)),
            searchMode: match ? 'qdrant+text' : 'embedding+text'
          };
        })
          .filter((asset) => asset.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, limit);

        if (ranked.length) {
          const identityRanked = await applyIdentityAwareRanking(ranked, query, filter.category);
          identityRanked.sort((a, b) => b.relevance - a.relevance);
          return res.json(identityRanked.map(({ embedding, ...asset }) => asset));
        }
      }
    } catch (error) {
      console.warn('Qdrant search failed; using MongoDB fallback:', error.message);
    }
  }

  const assets = await Asset.find(searchFilter).sort('-createdAt').limit(1000).lean();
  const ranked = assets.map((asset) => {
    const text = asset.searchText ||
      [asset.prompt || '', ...(asset.tags || []), asset.filename || '', asset.category || ''].join(' ');
    const semantic = queryVector && asset.embedding ? cosine(queryVector, asset.embedding) : 0;
    const lexical = lexicalScore(query, text);
    return {
      ...asset,
      relevance: Number((semantic > 0 ? semantic * 0.8 + lexical * 0.2 : lexical).toFixed(4)),
      searchMode: semantic > 0 ? 'embedding+text' : 'text-fallback'
    };
  }).filter((asset) => asset.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  const identityRanked = await applyIdentityAwareRanking(ranked, query, filter.category);
  identityRanked.sort((a, b) => b.relevance - a.relevance);
  res.json(identityRanked.map(({ embedding, ...asset }) => asset));
}));

/** Similar groups: within each of the 4 categories (or all if no category filter) */
r.get('/duplicates', wrap(async (req, res) => {
  const threshold = Number(req.query.threshold ?? config.similarThreshold);
  const vis = req.query.visibility;
  const category = req.query.category;
  const filter = { dhash: { $exists: true } };
  if (vis === 'public' || vis === 'private') filter.visibility = vis;
  if (category && CATS.includes(category)) filter.category = category;

  const all = await Asset.find(filter);
  // Group by category first, then cluster by dhash within each category
  const byCat = {};
  for (const a of all) {
    const key = a.category || 'uncategorized';
    (byCat[key] ||= []).push(a);
  }

  const result = [];
  for (const [cat, list] of Object.entries(byCat)) {
    if (list.length < 2) continue;
    const parent = list.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (hamming(list[i].dhash, list[j].dhash) <= threshold) parent[find(i)] = find(j);
    const groups = {};
    list.forEach((a, i) => (groups[find(i)] ||= []).push(a));
    for (const g of Object.values(groups)) {
      if (g.length > 1) result.push({ category: cat, assets: g });
    }
  }
  res.json(result);
}));

r.post('/', upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image required' });
  const tags = (req.body.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const visibility = req.body.visibility === 'public' ? 'public' : 'private';
  const category = CATS.includes(req.body.category) ? req.body.category : '';
  const out = await ingestImage({ buffer: req.file.buffer, kind: 'upload', tags, visibility, category });
  res.status(out.duplicate ? 200 : 201).json(out);
}));

/** Backend inpainting endpoint. Client supplies a PNG mask as base64; white pixels are edited. */
r.post('/:id/inpaint', wrap(async (req, res) => {
  if (config.generator.provider !== 'a1111') return res.status(400).json({ error: 'Inpainting endpoint currently requires GENERATOR_PROVIDER=a1111 and an enabled AUTOMATIC1111 API.' });
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const prompt = String(req.body?.prompt || '').trim();
  const maskBase64 = String(req.body?.maskBase64 || '');
  if (!prompt) return res.status(400).json({ error: 'An edit prompt is required' });
  if (!maskBase64) return res.status(400).json({ error: 'A maskBase64 PNG is required (white=edit, black=preserve)' });
  const imageBuffer = await readAssetBuffer(asset);
  const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64');
  const [sourceMeta, maskMeta] = await Promise.all([sharp(imageBuffer).metadata(), sharp(maskBuffer).metadata()]);
  if (!maskMeta.width || !maskMeta.height) return res.status(400).json({ error: 'Invalid mask image' });
  const normalizedMask = await sharp(maskBuffer).resize(sourceMeta.width, sourceMeta.height, { fit: 'fill' }).png().toBuffer();
  const output = await inpaintWithA1111({
    imageBase64: imageBuffer.toString('base64'), maskBase64: normalizedMask.toString('base64'), prompt,
    width: sourceMeta.width, height: sourceMeta.height,
    denoisingStrength: req.body?.denoisingStrength,
  });
  const result = await ingestImage({ buffer: output, kind: 'generated', identityIds: asset.identityIds, campaignId: asset.campaignId, prompt: `${asset.prompt || ''}\nInpaint: ${prompt}`.trim(), category: asset.category, visibility: 'private' });
  res.status(result.duplicate ? 200 : 201).json(result);
}));

r.patch('/:id/visibility', wrap(async (req, res) => {
  const vis = req.body.visibility === 'public' ? 'public' : 'private';
  const a = await Asset.findByIdAndUpdate(req.params.id, { visibility: vis }, { new: true });
  if (!a) return res.status(404).json({ error: 'Asset not found' });
  try { await syncAssetPayload(a); }
  catch (error) { console.warn('Qdrant visibility sync failed:', error.message); }
  res.json(a);
}));

r.patch('/:id/category', wrap(async (req, res) => {
  const cat = CATS.includes(req.body.category) ? req.body.category : '';
  const a = await Asset.findByIdAndUpdate(req.params.id, { category: cat }, { new: true });
  if (!a) return res.status(404).json({ error: 'Asset not found' });
  try { await syncAssetPayload(a); }
  catch (error) { console.warn('Qdrant category sync failed:', error.message); }
  res.json(a);
}));

r.delete('/:id', wrap(async (req, res) => {
  const a = await Asset.findById(req.params.id);
  if (!a) return res.json({ ok: true });

  try { await deleteAssetVector(a._id); }
  catch (error) { console.warn('Qdrant delete sync failed:', error.message); }

  // Soft-delete: move to Recycle Bin (keep file on disk for 24h restore)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await RecycleBin.create({
    kind: 'asset',
    originalId: a._id,
    snapshot: a.toObject(),
    reason: 'asset-delete',
    expiresAt,
  });

  await Asset.findByIdAndDelete(req.params.id);
  // Do NOT remove file yet — permanent delete / empty bin / TTL will clean it
  res.json({ ok: true, message: 'Asset moved to Recycle Bin for 24 hours.' });
}));

export default r;
