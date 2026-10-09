import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run seed, stop and restart the full stack, then run verify.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, '.local/persistence-check.json');
const frontend = 'http://127.0.0.1:5173/api/firestore';
const auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:';
const mode = process.argv[2] || 'seed';
assert.ok(['seed', 'verify'].includes(mode), 'Usage: node scripts/check-persistence.mjs seed|verify');

async function call(url, { method = 'GET', data, token, status = 200 } = {}) {
  const response = await fetch(url, {
    method, signal: AbortSignal.timeout(15000),
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  assert.equal(response.status, status, `${method} ${new URL(url).pathname} failed`);
  const body = await response.text();
  try { return JSON.parse(body); } catch { return body; }
}

function invoiceParams(state, remove = false) {
  const [year, month] = state.invoice.month.split('-');
  return new URLSearchParams({
    uid: state.uid, docId: 'racuni', subColId: year,
    [remove ? 'subDocId' : 'subColDocId']: month,
  });
}

function assertInvoice(actual, state) {
  const { uid, ...expected } = state.invoice;
  for (const [field, value] of Object.entries(expected)) {
    assert.deepEqual(actual[field], value, `Invoice field ${field} did not persist`);
  }
}

if (mode === 'seed') {
  assert.ok(!existsSync(fixturePath), 'A persistence check is pending; run verify first.');
  const nonce = randomUUID();
  const email = `persistence-${nonce}@local.test`;
  const password = randomBytes(24).toString('base64url');
  const user = await call(`${auth}signUp?key=demo-api-key`, {
    method: 'POST', data: { email, password, returnSecureToken: true },
  });
  assert.ok(user.localId && user.idToken, 'Local signup did not return a user/token');
  const invoice = {
    uid: user.localId, month: '2026-10', totalAmount: 75.25, energyCost: 45,
    networkCost: 20, surcharges: 5.25, penalties: 5, vat: 16.555,
    note: `local-persistence-check:${nonce}`,
  };
  const state = { uid: user.localId, email, password, idToken: user.idToken, invoice };
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await call(`${frontend}/manual`, { method: 'POST', data: invoice, token: user.idToken });
  assertInvoice(await call(`${frontend}/data?${invoiceParams(state)}`, { token: user.idToken }), state);
  console.log('SEED_OK: lokalni uporabnik in račun sta shranjena; zdaj ustavi in ponovno zaženi aplikacijo.');
} else {
  const state = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const user = await call(`${auth}signInWithPassword?key=demo-api-key`, {
    method: 'POST', data: { email: state.email, password: state.password, returnSecureToken: true },
  });
  assert.equal(user.localId, state.uid, 'The original local user did not persist');
  assert.equal(user.email, state.email);
  assertInvoice(await call(`${frontend}/data?${invoiceParams(state)}`, { token: user.idToken }), state);
  await call(`${frontend}/remove-subDocument?${invoiceParams(state, true)}`, {
    method: 'DELETE', token: user.idToken,
  });
  const removedResponse = await fetch(`${frontend}/data?${invoiceParams(state)}`, {
    headers: { Authorization: `Bearer ${user.idToken}` }, signal: AbortSignal.timeout(15000),
  });
  assert.ok(removedResponse.status === 404 || (removedResponse.ok && Object.keys(await removedResponse.json()).length === 0),
    'The temporary invoice was not removed');
  await call(`${auth}delete?key=demo-api-key`, { method: 'POST', data: { idToken: user.idToken } });
  unlinkSync(fixturePath);
  console.log('VERIFY_OK: prijava in račun sta preživela ponovni zagon; testni podatki so odstranjeni.');
}
