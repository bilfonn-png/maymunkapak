// POST /api/validate  body: key=MK1-...  → { valid, credits, remaining }. 502 when Paddle or the store can't be reached.
import { parseKey, cors, formBody } from './_license.js';
import { creditsOf, usedOf } from './_credits.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const txn = parseKey(formBody(req).key);
  if (!txn) return res.status(200).json({ valid: false, credits: 0, remaining: 0 });
  try {
    const credits = await creditsOf(txn, { fresh: true });   // re-checks refunds
    const remaining = Math.max(0, credits - (await usedOf(txn)));
    return res.status(200).json({ valid: credits > 0, credits, remaining });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream' });
  }
}
