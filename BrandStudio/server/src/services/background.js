import { waitUntil } from '@vercel/functions';

/**
 * Response bhejne ke baad bhi chalne wala kaam.
 * Vercel (serverless) pe response ke baad function freeze ho jata hai, isliye waitUntil se zinda rakhte hain.
 * Local / Docker pe ye sirf error log karke normal fire-and-forget hai.
 */
export function runInBackground(work) {
  const p = Promise.resolve(work).catch((e) => console.error('[background]', e?.message || e));
  if (process.env.VERCEL) {
    try { waitUntil(p); } catch { /* waitUntil request ke bahar available nahi */ }
  }
  return p;
}
