import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.LICENSE_SECRET = 'x'.repeat(40);
process.env.PADDLE_API_KEY = 'k';
process.env.PADDLE_PRODUCT_ID = 'pro_mk';
const { makeKey, parseKey, creditsOfPrice } = await import('../api/_license.js');
const { _resetMemory } = await import('../api/_store.js');
const claim = (await import('../api/claim.js')).default;
const validate = (await import('../api/validate.js')).default;
const spend = (await import('../api/spend.js')).default;

let paddleData;            // path prefix → data, or { down: true }
beforeEach(() => { paddleData = {}; _resetMemory(); });
globalThis.fetch = async (url) => {
  const u = new URL(url), path = u.pathname + u.search;
  if (paddleData.down) return new Response('', { status: 503 });
  const hit = Object.entries(paddleData).find(([p]) => path.startsWith(p));
  return hit ? Response.json({ data: hit[1] }) : new Response('', { status: 404 });
};
function call(handler, req) {
  return new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
      json(b) { resolve({ code: this.code, body: b }); }, end() { resolve({ code: this.code }); } };
    handler({ method: 'GET', query: {}, ...req }, res);
  });
}
const price = (credits, extra = {}) => ({ id: 'pri_' + credits, product_id: 'pro_mk', description: 'credits=' + credits, ...extra });
const paid = (items, extra = {}) => ({ '/transactions/txn_abc': { status: 'completed', items, ...extra }, '/adjustments': [] });
const key = () => makeKey('txn_abc');
const post = (h) => call(h, { method: 'POST', body: { key: key() } });

test('key round-trips and rejects tampering', () => {
  const k = key();
  assert.equal(parseKey(k), 'txn_abc');
  assert.equal(parseKey(k.replace('txn_abc', 'txn_abd')), null);
  assert.equal(parseKey('MK1-txn_abc-' + 'A'.repeat(22)), null);
  assert.equal(parseKey('nonsense'), null);
});

test('credits come from the price description or custom_data, only for our product', () => {
  assert.equal(creditsOfPrice(price(30)), 30);
  assert.equal(creditsOfPrice(price(0, { description: '', custom_data: { credits: '120' } })), 120);
  assert.equal(creditsOfPrice(price(30, { product_id: 'pro_other' })), 0);
  assert.equal(creditsOfPrice({ product_id: 'pro_mk', description: 'no credits here' }), 0);
});

test('claim returns a key and credits only for a paid credit pack', async () => {
  paddleData = paid([{ quantity: 2, price: price(30) }]);
  const ok = await call(claim, { query: { txn: 'txn_abc' } });
  assert.equal(ok.code, 200); assert.equal(parseKey(ok.body.key), 'txn_abc'); assert.equal(ok.body.credits, 60);

  paddleData = paid([{ quantity: 1, price: price(30) }], { status: 'ready' });
  assert.equal((await call(claim, { query: { txn: 'txn_abc' } })).code, 404);
  paddleData = paid([{ quantity: 1, price: price(30, { product_id: 'pro_other' }) }]);
  assert.equal((await call(claim, { query: { txn: 'txn_abc' } })).code, 404);
  assert.equal((await call(claim, { query: { txn: '../x' } })).code, 400);
});

test('spend counts down to zero and then refuses', async () => {
  paddleData = paid([{ quantity: 1, price: price(2) }]);
  assert.deepEqual((await post(validate)).body, { valid: true, credits: 2, remaining: 2 });
  assert.deepEqual((await post(spend)).body, { ok: true, remaining: 1 });
  assert.deepEqual((await post(spend)).body, { ok: true, remaining: 0 });
  assert.deepEqual((await post(spend)).body, { ok: false, remaining: 0 });
  assert.deepEqual((await post(validate)).body, { valid: true, credits: 2, remaining: 0 });
});

test('a refund empties the key; a forged key gets nothing; outages answer 502', async () => {
  paddleData = { ...paid([{ quantity: 1, price: price(30) }]), '/adjustments': [{ status: 'approved' }] };
  assert.deepEqual((await post(validate)).body, { valid: false, credits: 0, remaining: 0 });
  assert.deepEqual((await post(spend)).body, { ok: false, remaining: 0 });

  assert.deepEqual((await call(spend, { method: 'POST', body: { key: 'MK1-txn_abc-' + 'B'.repeat(22) } })).body, { ok: false, remaining: 0 });

  paddleData = { down: true };
  assert.equal((await post(validate)).code, 502);
});
