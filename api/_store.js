// Tiny key-value store for credit usage: Upstash Redis over REST (free tier is plenty).
// Vercel's Upstash integration sets KV_REST_API_URL/TOKEN; plain Upstash sets UPSTASH_REDIS_REST_URL/TOKEN.
// Without either (local dev, tests) it falls back to memory.
const URL_ = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const mem = new Map();

export async function redis(...cmd) {
  if (!URL_()) {
    if (process.env.VERCEL_ENV === 'production') throw new Error('Credit store not configured (UPSTASH_REDIS_REST_URL / KV_REST_API_URL)');
    return memory(cmd);
  }
  const r = await fetch(URL_(), { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw Object.assign(new Error('store ' + r.status), { upstream: true });
  return (await r.json()).result;
}
function memory([op, key, arg]) {
  switch (op.toUpperCase()) {
    case 'GET': return mem.has(key) ? String(mem.get(key)) : null;
    case 'SET': mem.set(key, arg); return 'OK';
    case 'INCR': mem.set(key, Number(mem.get(key) || 0) + 1); return mem.get(key);
    case 'DECR': mem.set(key, Number(mem.get(key) || 0) - 1); return mem.get(key);
    default: throw new Error('unsupported ' + op);
  }
}
export function _resetMemory() { mem.clear(); }
