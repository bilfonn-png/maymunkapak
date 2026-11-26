// Stateless license keys for Paddle sales: key = MK1-<transaction id>-<HMAC>.
// No database: the key proves which Paddle transaction it came from, and Paddle says whether that sale is still valid.
import { createHmac, timingSafeEqual } from 'node:crypto';

const PADDLE_API = () => (process.env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com');
const PRICE_IDS = () => (process.env.PADDLE_PRICE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

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

/* 'valid' | 'invalid' — throws on Paddle/network trouble so callers can answer 502 (the extension then keeps Pro). */
export async function checkTransaction(txnId) {
  const txn = await paddle('/transactions/' + encodeURIComponent(txnId));
  if (!txn || !['completed', 'paid'].includes(txn.status)) return 'invalid';
  const prices = PRICE_IDS();
  if (prices.length && !(txn.items || []).some(i => prices.includes(i.price && i.price.id))) return 'invalid';
  const refunds = await paddle('/adjustments?action=refund&transaction_id=' + encodeURIComponent(txnId));
  if ((refunds || []).some(a => a.status === 'approved')) return 'invalid';
  if (txn.subscription_id) {
    const sub = await paddle('/subscriptions/' + encodeURIComponent(txn.subscription_id));
    if (!sub || !['active', 'trialing', 'past_due'].includes(sub.status)) return 'invalid';
  }
  return 'valid';
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}
