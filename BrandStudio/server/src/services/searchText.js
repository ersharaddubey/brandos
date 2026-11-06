const GENERIC_VALUES = new Set([
  'new identity', 'unknown', 'none', 'n/a', 'na',
  'test', 'yes', 'no', 'char', 'bath', 'sss', 'ssss', 'ddd', 'dsd'
]);

// Filter placeholder identity names without removing valid identity types.
const GENERIC_IDENTITY_NAMES = new Set([
  'product', 'brand', 'character', 'environment',
  'new identity', 'unknown', 'none', 'test',
  'sss', 'ssss', 'ddd', 'dsd'
]);

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function meaningful(value, minLength = 3) {
  const text = clean(value);
  if (text.length < minLength) return '';
  if (GENERIC_VALUES.has(text.toLowerCase())) return '';
  return text;
}

/**
 * Build searchable text without modifying the original prompt or identity.
 * identities must contain only identities linked to this asset.
 */
export function buildAssetSearchText(asset, identities = []) {
  const parts = [
    asset.filename,
    asset.kind,
    asset.category,
    ...(asset.tags || []),
    asset.prompt
  ];

  for (const identity of identities) {
    // Do not use failed identities as searchable metadata.
    if (String(identity.status || '').toLowerCase() === 'error') {
      continue;
    }

    const rawName = clean(identity.name).toLowerCase();
    const name = GENERIC_IDENTITY_NAMES.has(rawName)
      ? ''
      : meaningful(identity.name);
    const type = meaningful(identity.type);
    const description = meaningful(identity.description, 16);

    if (name) parts.push(name);
    if (type) parts.push(type);
    if (description) parts.push(description);

    for (const anchor of identity.anchors || []) {
      const value = meaningful(anchor, 5);
      if (value) parts.push(value);
    }
  }

  const seen = new Set();

  return parts
    .map(clean)
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' ');
}
