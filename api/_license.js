// Credit keys for Paddle purchases: key = MK1-<transaction id>-<HMAC>.
// The key proves which Paddle transaction it came from; Paddle says how many credits that purchase bought
// (from the price's "credits=N" description or custom_data.credits) and whether it was refunded.
import { createHmac, timingSafeEqual } from 'node:crypto';

const PADDLE_API = () => (process.env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com');

function sign(txnId) {
  const secret = process.env.LICENSE_SECRET;
  if (!secret || secret.length < 32) throw new Error('LICENSE_SECRET missing or shorter than 32 characters');
  return createHmac('sha256', secret).update('mk1:' + txnId).digest('base64url').slice(0, 22);
}
export function makeKey(txnId) { return `MK1-${txnId}-${sign(txnId)}`; }
export function parseKey(key) {
  const m = /^MK1-(txn_[a-z0-9]+)-([A-Za-z0-9_-]{22})$/.exec(String(key || '').trim());
  if (!m) return null;
  const a = Buffer.from(m[2]), b = Buffer.from(sign(m[1]));
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}

async function paddle(path) {
  const r = await fetch(PADDLE_API() + path, { headers: { Authorization: 'Bearer ' + process.env.PADDLE_API_KEY } });
  if (r.status === 404) return null;
  if (!r.ok) throw Object.assign(new Error('Paddle ' + r.status), { upstream: true });
  return (await r.json()).data;
}

export function creditsOfPrice(price) {
  if (!price) return 0;
  if (process.env.PADDLE_PRODUCT_ID && price.product_id !== process.env.PADDLE_PRODUCT_ID) return 0;
  const fromData = price.custom_data && Number(price.custom_data.credits);
  if (fromData > 0) return Math.floor(fromData);
  const m = /credits\s*=\s*(\d+)/i.exec(price.description || '');
  return m ? Number(m[1]) : 0;
}

/* → number of credits this purchase is worth (0 = not paid, refunded or not ours). Throws when Paddle can't be reached. */
export async function creditsForTransaction(txnId) {
  const txn = await paddle('/transactions/' + encodeURIComponent(txnId));
  if (!txn || !['completed', 'paid'].includes(txn.status)) return 0;
  const credits = (txn.items || []).reduce((n, i) => n + (i.quantity || 1) * creditsOfPrice(i.price), 0);
  if (!credits) return 0;
  const refunds = await paddle('/adjustments?action=refund&transaction_id=' + encodeURIComponent(txnId));
  if ((refunds || []).some(a => a.status === 'approved')) return 0;
  return credits;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}
export function formBody(req) {
  return typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
}
