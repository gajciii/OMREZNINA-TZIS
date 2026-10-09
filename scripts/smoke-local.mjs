import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// End-to-end check against a running local stack. It only creates and removes its own test user.
const origin = process.env.OMREZNINA_URL || 'http://127.0.0.1:5173';
const authOrigin = 'http://127.0.0.1:9099';
const project = 'demo-omreznina';
const email = `local-smoke-${randomUUID()}@example.test`;
const password = 'LocalSmoke!12345';
let token;
let uid;

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  assert.ok(response.ok, `${response.status} ${url}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return text; }
}
const jsonPost = (url, body) => request(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const auth = (action, body) => jsonPost(`${authOrigin}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=demo-api-key`, body);
const api = (path) => `${origin}/api/${path}`;

try {
  const html = await request(`${origin}/auth/login`);
  assert.ok(html.includes('id="root"'));
  assert.equal((await request(api('health'))).status, 'UP');
  const devices = await request(api('api/simulation/available-devices'));
  assert.ok(Array.isArray(devices) && devices.length > 0, 'Simulation proxy must preserve its api prefix');
  console.log('✓ Frontend, proxy in backend');

  const user = await auth('signUp', { email, password, returnSecureToken: true });
  uid = user.localId;
  token = user.idToken;
  await auth('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: token });
  const codes = await request(`${authOrigin}/emulator/v1/projects/${project}/oobCodes`);
  const code = codes.oobCodes.find((item) => item.email === email && item.requestType === 'VERIFY_EMAIL');
  assert.ok(code?.oobCode, 'Local verification code missing');
  await auth('update', { oobCode: code.oobCode });
  const signedIn = await auth('signInWithPassword', { email, password, returnSecureToken: true });
  token = signedIn.idToken;
  const account = await auth('lookup', { idToken: token });
  assert.equal(account.users[0].emailVerified, true);
  console.log('✓ Lokalna registracija, potrditev emaila in prijava');

  await jsonPost(api('firestore/manual'), {
    uid, month: '2025-01', totalAmount: 42, energyCost: 20, networkCost: 10,
    surcharges: 2, penalties: 0, vat: 10, note: 'Local smoke test',
  });
  const invoice = await request(api(`firestore/data?uid=${uid}&docId=racuni&subColId=2025&subColDocId=01`));
  assert.equal(invoice.totalAmount, 42);
  await jsonPost(api('api/simulation/setAgreedPowers'), { uid, agreedPowers: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 } });
  const powers = await request(api(`firestore/data?uid=${uid}&docId=dogovorjena-moc`));
  assert.equal(powers['1'], 5000);
  console.log('✓ Shranjevanje in branje lokalne baze prek Java backenda');

  const daily = new FormData();
  daily.set('uid', uid);
  daily.set('file', new Blob([
    'Datum,Prejeta delovna energija ET,Oddana delovna energija ET\n2025-01-01,100,0\n2025-01-02,112,1\n',
  ], { type: 'text/csv' }), 'daily.csv');
  await request(api('user/upload-file'), { method: 'POST', body: daily });
  const consumption = await request(api(`firestore/data?uid=${uid}&docId=poraba&subColId=2025-01&subColDocId=2025-01-01`));
  assert.equal(consumption['poraba et'], 11);
  console.log('✓ CSV → lokalni parser → lokalna baza');

  const powerCsv = 'Leto,Mesec,Časovna značka,P+ Prejeta delovna moč\n2025,1,2025-01-06 08:00:00,6\n2025,1,2025-01-06 08:15:00,7\n';
  for (const path of ['user/upload-power-consumption', 'user/optimal-power']) {
    const form = new FormData();
    form.set('uid', uid);
    form.set('power_by_months', JSON.stringify({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 }));
    form.set('file', new Blob([powerCsv], { type: 'text/csv' }), 'power.csv');
    await request(api(path), { method: 'POST', body: form });
  }
  const prediction = await jsonPost(api('user/prediction/monthly-overrun'), { uid, year: '2026', month: '01' });
  assert.ok(prediction.stats && prediction.stats.overruns_count > 0);
  console.log('✓ Prekoračitve, optimum in lokalna predikcija');

  await auth('sendOobCode', { requestType: 'PASSWORD_RESET', email });
  const resetCodes = await request(`${authOrigin}/emulator/v1/projects/${project}/oobCodes`);
  const resetCode = resetCodes.oobCodes.find((item) => item.email === email && item.requestType === 'PASSWORD_RESET');
  await auth('resetPassword', { oobCode: resetCode.oobCode, newPassword: `${password}!` });
  token = (await auth('signInWithPassword', { email, password: `${password}!`, returnSecureToken: true })).idToken;
  console.log('✓ Lokalna ponastavitev gesla');
} finally {
  if (uid) await request(api(`firestore/remove?uid=${uid}&docId=racuni`), { method: 'DELETE' });
  if (uid) for (const docId of ['dogovorjena-moc', 'poraba', 'prekoracitve', 'optimum']) {
    await request(api(`firestore/remove?uid=${uid}&docId=${docId}`), { method: 'DELETE' });
  }
  if (token) await auth('delete', { idToken: token });
}
console.log('Lokalni sistem je uspešno preverjen.');
