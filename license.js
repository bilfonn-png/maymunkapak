/* MaymunKapak — credit wallet (browser side).
 * Each Paddle purchase gives a key (MK1-...) worth N credits. 1 credit = 1 watermark-free download or channel upload.
 * The server keeps the real balance; this file keeps the keys and a cached balance in localStorage. */
const WALLET_KEY = 'mk_wallet';
const KEY_RE = /^MK1-txn_[a-z0-9]+-[A-Za-z0-9_-]{22}$/;

function readWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null');
    if (w && Array.isArray(w.keys)) return w;
    const old = JSON.parse(localStorage.getItem('mk_license') || 'null');   // key saved by thanks.html
    if (old && old.key) return { keys: [{ key: old.key, remaining: old.remaining ?? 1 }] };
  } catch {}
  return { keys: [] };
}
function writeWallet(w) { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); localStorage.removeItem('mk_license'); } catch {} }
function credits() { return readWallet().keys.reduce((n, k) => n + (k.remaining || 0), 0); }
function isPro() { return credits() > 0; }

async function api(path, key) {
  try {
    const r = await fetch(MK_CONFIG.siteUrl + '/api/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key }) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/* Add a purchased key. → { ok: true, added } or { ok: false, reason: 'invalid' | 'network' | 'duplicate' } */
async function addKey(rawKey) {
  const key = (rawKey || '').trim();
  if (!KEY_RE.test(key)) return { ok: false, reason: 'invalid' };
  const w = readWallet();
  if (w.keys.some(k => k.key === key)) return { ok: false, reason: 'duplicate' };
  const v = await api('validate', key);
  if (!v) return { ok: false, reason: 'network' };
  if (!v.valid) return { ok: false, reason: 'invalid' };
  w.keys.push({ key, remaining: v.remaining }); writeWallet(w);
  return { ok: true, added: v.remaining };
}

/* Refresh balances from the server (refunded keys drop to 0). Network trouble keeps the cached numbers. */
async function refreshCredits() {
  const w = readWallet(); if (!w.keys.length) return credits();
  for (const k of w.keys) { const v = await api('validate', k.key); if (v) k.remaining = v.valid ? v.remaining : 0; }
  writeWallet(w); return credits();
}

/* Spend one credit. → { ok: true } or { ok: false, reason: 'empty' | 'network' } */
async function spendCredit() {
  const w = readWallet();
  for (const k of w.keys) {
    if (!(k.remaining > 0)) continue;
    const r = await api('spend', k.key);
    if (!r) return { ok: false, reason: 'network' };
    k.remaining = r.remaining; writeWallet(w);
    if (r.ok) return { ok: true };
  }
  return { ok: false, reason: 'empty' };
}

function clearWallet() { writeWallet({ keys: [] }); }
