import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.LICENSE_SECRET = 'x'.repeat(40);
process.env.PADDLE_API_KEY = 'k';
process.env.PADDLE_PRICE_IDS = 'pri_pro';
const { makeKey, parseKey } = await import('../api/_license.js');
const claim = (await import('../api/claim.js')).default;
const validate = (await import('../api/validate.js')).default;

let paddleData;            // path → data (or 'down')
beforeEach(() => { paddleData = {}; });
globalThis.fetch = async (url) => {
  const path = new URL(url).pathname + new URL(url).search;
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
const paidTxn = (extra = {}) => ({ '/transactions/txn_abc': { status: 'completed', items: [{ price: { id: 'pri_pro' } }], ...extra }, '/adjustments': [] });

test('key round-trips and rejects tampering', () => {
  const k = makeKey('txn_abc');
  assert.equal(parseKey(k), 'txn_abc');
  assert.equal(parseKey(k.replace('txn_abc', 'txn_abd')), null);
  assert.equal(parseKey('MK1-txn_abc-' + 'A'.repeat(22)), null);
  assert.equal(parseKey('nonsense'), null);
});

test('claim returns a key only for a paid Pro purchase', async () => {
  Object.assign(paddleData, paidTxn());
  const ok = await call(claim, { query: { txn: 'txn_abc' } });
  assert.equal(ok.code, 200); assert.equal(parseKey(ok.body.key), 'txn_abc');

  paddleData = paidTxn({ status: 'ready' });
  assert.equal((await call(claim, { query: { txn: 'txn_abc' } })).code, 404);
  paddleData = paidTxn({ items: [{ price: { id: 'pri_other' } }] });
  assert.equal((await call(claim, { query: { txn: 'txn_abc' } })).code, 404);
  assert.equal((await call(claim, { query: { txn: '../x' } })).code, 400);
});

test('validate: refunds and cancelled subscriptions turn Pro off, outages do not decide', async () => {
  const key = makeKey('txn_abc');
  const v = () => call(validate, { method: 'POST', body: { key } });
  Object.assign(paddleData, paidTxn());
  assert.deepEqual((await v()).body, { valid: true });

  paddleData = { ...paidTxn(), '/adjustments': [{ status: 'approved' }] };
  assert.deepEqual((await v()).body, { valid: false });

  paddleData = { ...paidTxn({ subscription_id: 'sub_1' }), '/subscriptions/sub_1': { status: 'canceled' } };
  assert.deepEqual((await v()).body, { valid: false });
  paddleData = { ...paidTxn({ subscription_id: 'sub_1' }), '/subscriptions/sub_1': { status: 'active' } };
  assert.deepEqual((await v()).body, { valid: true });

  paddleData = { down: true };
  assert.equal((await v()).code, 502);
  assert.deepEqual((await call(validate, { method: 'POST', body: { key: 'MK1-txn_abc-' + 'B'.repeat(22) } })).body, { valid: false });
});
