/* MaymunKapak — Pro license check (Lemon Squeezy or Gumroad license keys).
 * Runs fully in the browser; the key and its instance id are kept in localStorage. */
const LICENSE_KEY = 'mk_license';
const DAY = 864e5;

function readLicense() { try { return JSON.parse(localStorage.getItem(LICENSE_KEY) || 'null'); } catch { return null; } }
function writeLicense(v) { try { v ? localStorage.setItem(LICENSE_KEY, JSON.stringify(v)) : localStorage.removeItem(LICENSE_KEY); } catch {} }
function isPro() { const l = readLicense(); return !!(l && l.active); }

async function postForm(url, data) {
  const r = await fetch(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) });
  let body = null; try { body = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, body: body || {} };
}
const LS_API = 'https://api.lemonsqueezy.com/v1/licenses/';
const GR_API = 'https://api.gumroad.com/v2/licenses/verify';

function lemonProductOk(meta) { return MK_CONFIG.lemonProductId == null || (meta && Number(meta.product_id) === Number(MK_CONFIG.lemonProductId)); }
function gumroadPurchaseOk(p) { return p && !p.refunded && !p.chargebacked && !p.disputed && !p.subscription_cancelled_at && !p.subscription_failed_at; }

/* Returns { ok: true } or { ok: false, reason: 'invalid' | 'network' } */
async function activateLicense(rawKey) {
  const key = (rawKey || '').trim(); if (!key) return { ok: false, reason: 'invalid' };
  try {
    if (MK_CONFIG.licenseProvider === 'gumroad') {
      const r = await postForm(GR_API, { product_id: MK_CONFIG.gumroadProductId, license_key: key, increment_uses_count: 'true' });
      if (r.status >= 500) return { ok: false, reason: 'network' };
      if (!r.body.success || !gumroadPurchaseOk(r.body.purchase)) return { ok: false, reason: 'invalid' };
      writeLicense({ provider: 'gumroad', key, active: true, checkedAt: Date.now() });
      return { ok: true };
    }
    const r = await postForm(LS_API + 'activate', { license_key: key, instance_name: 'MaymunKapak ' + (navigator.platform || 'browser') });
    if (r.status >= 500) return { ok: false, reason: 'network' };
    if (!r.body.activated || !lemonProductOk(r.body.meta)) {
      if (r.body.activated && r.body.instance) postForm(LS_API + 'deactivate', { license_key: key, instance_id: r.body.instance.id }).catch(() => {});
      return { ok: false, reason: 'invalid' };
    }
    writeLicense({ provider: 'lemonsqueezy', key, instanceId: r.body.instance.id, active: true, checkedAt: Date.now() });
    return { ok: true };
  } catch { return { ok: false, reason: 'network' }; }
}

/* Re-check now and then. A definite "not valid" answer (refund, expiry, disabled) turns Pro off; network errors don't. */
async function revalidateLicense(force) {
  const l = readLicense(); if (!l || !l.active) return false;
  if (!force && Date.now() - (l.checkedAt || 0) < MK_CONFIG.revalidateDays * DAY) return true;
  try {
    let valid;
    if (l.provider === 'gumroad') {
      const r = await postForm(GR_API, { product_id: MK_CONFIG.gumroadProductId, license_key: l.key, increment_uses_count: 'false' });
      if (r.status >= 500) return true;
      valid = !!r.body.success && gumroadPurchaseOk(r.body.purchase);
    } else {
      const r = await postForm(LS_API + 'validate', { license_key: l.key, instance_id: l.instanceId });
      if (r.status >= 500) return true;
      valid = !!r.body.valid && lemonProductOk(r.body.meta);
    }
    writeLicense(valid ? { ...l, checkedAt: Date.now() } : null);
    return valid;
  } catch { return true; }
}

async function deactivateLicense() {
  const l = readLicense();
  if (l && l.provider === 'lemonsqueezy') { try { await postForm(LS_API + 'deactivate', { license_key: l.key, instance_id: l.instanceId }); } catch {} }
  writeLicense(null);
}
