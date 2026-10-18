import { useState } from 'react';
import { PLACEHOLDER } from '../lib/placeholder';

// Shows an image; if it is missing or fails to load, shows the dummy image instead
export default function SmartImg({ src, alt = '', className = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  const shown = !src || failed ? PLACEHOLDER : src;
  return <img className={className} src={shown} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />;
}
