// POST /api/spend  body: key=MK1-...  → { ok, remaining }. Called once per watermark-free download or channel upload.
import { parseKey, cors, formBody } from './_license.js';
import { spendOne } from './_credits.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const txn = parseKey(formBody(req).key);
  if (!txn) return res.status(200).json({ ok: false, remaining: 0 });
  try {
    return res.status(200).json(await spendOne(txn));
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'upstream' });
  }
}
