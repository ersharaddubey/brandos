import crypto from 'crypto';
import sharp from 'sharp';

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// 64-bit difference hash -> 16 hex chars
export async function dhash(buf) {
  const px = await sharp(buf).removeAlpha().grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(16, '0');
}

export function hamming(a, b) {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}
