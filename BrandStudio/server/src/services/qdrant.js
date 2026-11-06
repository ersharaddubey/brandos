import { createHash } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import config from '../config.js';

const client = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
});

const collection = config.qdrant.collection;
let collectionReady;

export function qdrantPointId(assetId) {
  const hex = createHash('sha256').update(String(assetId)).digest('hex');
  const chars = hex.slice(0, 32).split('');
  chars[12] = '5';
  chars[16] = ((parseInt(chars[16], 16) & 3) | 8).toString(16);
  const id = chars.join('');
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export async function ensureQdrantCollection() {
  if (!collectionReady) {
    collectionReady = (async () => {
      const result = await client.getCollections();
      const exists = result.collections.some((item) => item.name === collection);

      if (!exists) {
        await client.createCollection(collection, {
          vectors: {
            size: Number(config.qdrant.vectorSize) || 768,
            distance: 'Cosine',
          },
          on_disk_payload: true,
        });
      }

      const info = await client.getCollection(collection);
      const actualSize = info.config?.params?.vectors?.size;
      const expectedSize = Number(config.qdrant.vectorSize) || 768;

      if (actualSize !== expectedSize) {
        throw new Error(
          `Qdrant vector size mismatch: collection=${actualSize}, configured=${expectedSize}`,
        );
      }
    })().catch((error) => {
      collectionReady = null;
      throw error;
    });
  }

  return collectionReady;
}

export async function upsertAssetVector(asset, vector) {
  if (!asset?._id || !Array.isArray(vector) || !vector.length) return false;

  await ensureQdrantCollection();

  const point = {
    id: qdrantPointId(asset._id),
    vector,
    payload: {
      assetId: String(asset._id),
      visibility: asset.visibility || 'private',
      category: asset.category || '',
      kind: asset.kind || 'upload',
      searchText: asset.searchText || '',
      tags: asset.tags || [],
    },
  };

  await client.upsert(collection, {
    wait: true,
    points: [point],
  });

  return true;
}

export async function searchAssetVectors(vector, {
  limit = 50,
  visibility,
  category,
  kind,
} = {}) {
  if (!Array.isArray(vector) || !vector.length) return [];

  await ensureQdrantCollection();

  const must = [];
  if (visibility === 'public' || visibility === 'private') {
    must.push({ key: 'visibility', match: { value: visibility } });
  }
  if (category) {
    must.push({ key: 'category', match: { value: category } });
  }
  if (kind) {
    must.push({ key: 'kind', match: { value: kind } });
  }

  const response = await client.query(collection, {
    query: vector,
    limit: Math.min(1000, Math.max(1, limit)),
    with_payload: true,
    filter: must.length ? { must } : undefined,
  });

  const points = response.points || response.result?.points || [];

  return points
    .filter((point) => point.payload?.assetId)
    .map((point) => ({
      assetId: String(point.payload.assetId),
      score: Number(point.score) || 0,
    }));
}

export async function deleteAssetVector(assetId) {
  await ensureQdrantCollection();

  await client.delete(collection, {
    wait: true,
    points: [qdrantPointId(assetId)],
  });
}

export async function syncAssetPayload(asset) {
  if (!asset?._id || !Array.isArray(asset.embedding) || !asset.embedding.length) {
    return false;
  }

  return upsertAssetVector(asset, asset.embedding);
}
