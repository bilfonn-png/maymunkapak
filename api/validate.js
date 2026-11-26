// POST /api/validate  body: key=MK1-...  → { valid: true|false }. 502 when Paddle can't be reached.
import { parseKey, checkTransaction, cors } from './_license.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
  const txn = parseKey(body.key);
  if (!txn) return res.status(200).json({ valid: false });
  try {
    return res.status(200).json({ valid: (await checkTransaction(txn)) === 'valid' });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream' });
  }
}
