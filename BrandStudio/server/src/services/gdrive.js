/**
 * Google Drive share links → file id + usable URLs.
 * Video must be shared "Anyone with the link" for server/client to read.
 */

export function parseGoogleDriveId(input) {
  const u = String(input || '').trim();
  if (!u) return null;
  let m = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = u.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  // bare id
  if (/^[a-zA-Z0-9_-]{20,}$/.test(u)) return u;
  return null;
}

export function driveViewUrl(id) {
  return `https://drive.google.com/file/d/${id}/view`;
}

export function driveDirectUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

export function drivePreviewEmbed(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Resolve any drive share URL or id → { id, viewUrl, directUrl, previewUrl } */
export function resolveDriveLink(input) {
  const id = parseGoogleDriveId(input);
  if (!id) return null;
  return {
    id,
    viewUrl: driveViewUrl(id),
    directUrl: driveDirectUrl(id),
    previewUrl: drivePreviewEmbed(id),
  };
}

/**
 * Best-effort HEAD/GET to check the link is reachable.
 * Large Drive files often need a confirm cookie — we still return the resolved URLs for the prompt.
 */
export async function probeDriveVideo(input, { timeoutMs = 12000 } = {}) {
  const resolved = resolveDriveLink(input);
  if (!resolved) {
    const err = new Error('Invalid Google Drive link. Use: https://drive.google.com/file/d/FILE_ID/view');
    err.status = 400;
    throw err;
  }
  let reachable = false;
  let contentType = '';
  let contentLength = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(resolved.directUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Range: 'bytes=0-1023' },
    });
    clearTimeout(t);
    contentType = res.headers.get('content-type') || '';
    const cl = res.headers.get('content-length');
    if (cl) contentLength = Number(cl);
    // html = often virus-scan interstitial or login page
    reachable = res.ok && !/text\/html/i.test(contentType);
  } catch {
    reachable = false;
  }
  return {
    ...resolved,
    reachable,
    contentType,
    contentLength,
    note: reachable
      ? 'Drive link reachable — use as reference video URL in generators.'
      : 'Could not stream file (set sharing to “Anyone with the link”, or use local upload). Link is still embedded in the prompt.',
  };
}
