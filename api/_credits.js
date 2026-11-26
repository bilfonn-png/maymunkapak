import { creditsForTransaction } from './_license.js';
import { redis } from './_store.js';

// Paddle's answer is cached for a day so spending a credit doesn't call Paddle every time.
export async function creditsOf(txn, { fresh = false } = {}) {
  if (!fresh) { const c = await redis('GET', 'mk:cred:' + txn); if (c !== null) return Number(c); }
  const credits = await creditsForTransaction(txn);
  await redis('SET', 'mk:cred:' + txn, String(credits), 'EX', 86400);
  return credits;
}
export async function usedOf(txn) { return Number((await redis('GET', 'mk:used:' + txn)) || 0); }

/* → { ok, remaining } ; ok=false when the key has no credits left */
export async function spendOne(txn) {
  const credits = await creditsOf(txn);
  if (credits <= 0) return { ok: false, remaining: 0 };
  const used = Number(await redis('INCR', 'mk:used:' + txn));
  if (used > credits) { await redis('DECR', 'mk:used:' + txn); return { ok: false, remaining: 0 }; }
  return { ok: true, remaining: credits - used };
}
