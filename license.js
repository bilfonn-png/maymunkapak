/* MaymunKapak — Pro license check. Keys come from Paddle purchases (see api/ and buy.html);
 * our /api/validate asks Paddle whether the sale is still paid (not refunded or cancelled).
 * The key is kept in localStorage. */
const LICENSE_KEY = 'mk_license';
const DAY = 864e5;

function readLicense() { try { return JSON.parse(localStorage.getItem(LICENSE_KEY) || 'null'); } catch { return null; } }
function writeLicense(v) { try { v ? localStorage.setItem(LICENSE_KEY, JSON.stringify(v)) : localStorage.removeItem(LICENSE_KEY); } catch {} }
function isPro() { const l = readLicense(); return !!(l && l.active); }

/* → true | false, or null when the server can't be reached */
async function checkKey(key) {
  try {
    const r = await fetch(MK_CONFIG.siteUrl + '/api/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key }) });
    if (!r.ok) return null;
    return !!(await r.json()).valid;
  } catch { return null; }
}

/* Returns { ok: true } or { ok: false, reason: 'invalid' | 'network' } */
async function activateLicense(rawKey) {
  const key = (rawKey || '').trim();
  if (!/^MK1-txn_[a-z0-9]+-[A-Za-z0-9_-]{22}$/.test(key)) return { ok: false, reason: 'invalid' };
  const v = await checkKey(key);
  if (v === null) return { ok: false, reason: 'network' };
  if (!v) return { ok: false, reason: 'invalid' };
  writeLicense({ key, active: true, checkedAt: Date.now() });
  return { ok: true };
}

/* A definite "not valid" (refund, cancelled subscription) turns Pro off; network trouble doesn't. */
async function revalidateLicense(force) {
  const l = readLicense(); if (!l || !l.active) return false;
  if (!force && Date.now() - (l.checkedAt || 0) < MK_CONFIG.revalidateDays * DAY) return true;
  const v = await checkKey(l.key);
  if (v === null) return true;
  writeLicense(v ? { ...l, checkedAt: Date.now() } : null);
  return v;
}

async function deactivateLicense() { writeLicense(null); }
