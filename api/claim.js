// GET /api/claim?txn=txn_... → { key, credits } once the Paddle checkout has completed. Used by thanks.html right after purchase.
import { makeKey, cors } from './_license.js';
import { creditsOf } from './_credits.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const txn = String((req.query && req.query.txn) || '');
  if (!/^txn_[a-z0-9]+$/.test(txn)) return res.status(400).json({ error: 'bad_txn' });
  try {
    const credits = await creditsOf(txn, { fresh: true });
    if (!credits) return res.status(404).json({ error: 'not_paid' });   // may still be processing: thanks.html retries
    return res.status(200).json({ key: makeKey(txn), credits });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream' });
  }
}
