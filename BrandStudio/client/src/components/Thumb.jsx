import { useState } from 'react';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Resolve asset / ref object or string path → public URL */
export function assetUrl(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') {
    if (ref.startsWith('http') || ref.startsWith('blob:')) return ref;
    if (ref.startsWith('/')) return BASE + ref;
    return `${BASE}/uploads/${ref}`;
  }
  const u = ref.url || ref.filename;
  if (!u) return null;
  if (String(u).startsWith('http') || String(u).startsWith('blob:')) return String(u);
  if (String(u).startsWith('/')) return BASE + String(u);
  return `${BASE}/uploads/${u}`;
}

/**
 * Always reserves the same square space; never overflows parent.
 * size → fixed chip avatar (thumb-sm). Otherwise full-width card thumb.
 */
export default function Thumb({
  src,
  label = '',
  type = '',
  className = 'thumb',
  size,
}) {
  const [broken, setBroken] = useState(false);
  const url = src && !broken ? src : null;
  const initial = (label || type || '?').trim().slice(0, 1).toUpperCase() || '?';
  const isSm = Boolean(size);
  const cls = [className, isSm ? 'thumb-sm' : '', !url ? 'placeholder' : '']
    .filter(Boolean)
    .join(' ');

  const boxStyle = isSm
    ? {
        width: size,
        height: size,
        minWidth: size,
        maxWidth: size,
        maxHeight: size,
        objectFit: 'cover',
      }
    : {
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        objectFit: 'cover',
      };

  if (!url) {
    return (
      <div className={cls} title={label || type || 'No image'} style={boxStyle}>
        <span className="thumb-initial">{initial}</span>
        {!isSm && type ? <span className="thumb-type">{type}</span> : null}
      </div>
    );
  }

  return (
    <img
      className={cls}
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      style={boxStyle}
      onError={() => setBroken(true)}
    />
  );
}
