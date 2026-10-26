/// <reference types="node" />
import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { randomUUID } from 'node:crypto';

type CaseId = 'TP-01' | 'TP-02' | 'TP-03' | 'TP-04' | 'TP-05';
type FixtureValue = string | number | boolean;
type Fields = Record<string, { stringValue?: string; doubleValue?: number; booleanValue?: boolean }>;
type Document = { name: string; fields?: Fields; createTime?: string };
type Snapshot = Map<string, Fields>;
type Fixture = { caseId: CaseId; initial: Snapshot; seeded: Snapshot };

// Intentionally fixed to local demo emulators. These tasks must never reach cloud data.
const project = 'demo-omreznina';
const authOrigin = 'http://127.0.0.1:9099';
const firestoreOrigin = 'http://127.0.0.1:8081';
const documentPrefix = `projects/${project}/databases/(default)/documents`;
const documentBase = `${firestoreOrigin}/v1/${documentPrefix}`;
const fixtures = new Map<string, Fixture>();
const caseIds: CaseId[] = ['TP-01', 'TP-02', 'TP-03', 'TP-04', 'TP-05'];

async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const parsed = new URL(url);
  ok([authOrigin, firestoreOrigin].includes(parsed.origin), 'Only local demo emulator requests are permitted');
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Admin bypass is only for Firestore. Auth's client flows need the ID token
      // returned by signUp; an owner header changes the emulator's Auth semantics.
      ...(parsed.origin === firestoreOrigin ? { Authorization: 'Bearer owner' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  ok(response.ok, `${method} ${parsed.pathname}: ${response.status} ${raw.slice(0, 300)}`);
  return (raw ? JSON.parse(raw) : null) as T;
}

const auth = <T>(action: string, body: unknown) => request<T>(
  `${authOrigin}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=demo-api-key`, 'POST', body,
);

function ownedPath(uid: string, path: string): string {
  ok(fixtures.has(uid), 'The fixture registry must own this UID');
  ok(path.startsWith(`${uid}/`) && !path.split('/').some((part) => !part || part === '.' || part === '..'),
    'Document path must stay inside the test user namespace');
  return path.split('/').map(encodeURIComponent).join('/');
}

function fields(values: Record<string, FixtureValue>): Fields {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
    typeof value === 'number' ? { doubleValue: value }
      : typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
  ]));
}

async function putAndVerify(uid: string, relativePath: string, values: Record<string, FixtureValue>) {
  const path = ownedPath(uid, `${uid}/${relativePath}`);
  const expected = fields(values);
  await request(`${documentBase}/${path}`, 'PATCH', { fields: expected });
  const stored = await request<Document>(`${documentBase}/${path}`);
  deepStrictEqual(stored.fields, expected, `Fixture readback failed: ${relativePath}`);
  fixtures.get(uid)!.seeded.set(`${uid}/${relativePath}`, expected);
}

async function assertFixturesUnchanged(uid: string): Promise<null> {
  const fixture = fixtures.get(uid);
  ok(fixture, 'Only fixtures prepared by this Cypress process may be checked');
  ok(fixture.seeded.size > 0, `${fixture.caseId} has no seeded documents to compare`);
  for (const [path, expected] of fixture.seeded) {
    const stored = await request<Document>(`${documentBase}/${ownedPath(uid, path)}`);
    deepStrictEqual(stored.fields, expected, `${fixture.caseId}: viewing data changed ${path}`);
  }
  return null;
}

/** Includes missing parent documents, because invoices and consumption use subcollections. */
async function snapshot(uid: string): Promise<Snapshot> {
  ok(fixtures.has(uid), 'Cannot inspect an unowned user');
  const result: Snapshot = new Map();
  async function visitCollection(collectionPath: string) {
    ok(collectionPath === uid || collectionPath.startsWith(`${uid}/`), 'Invalid collection namespace');
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: '100', showMissing: 'true' });
      if (pageToken) query.set('pageToken', pageToken);
      const encoded = collectionPath.split('/').map(encodeURIComponent).join('/');
      const page = await request<{ documents?: Document[]; nextPageToken?: string }>(
        `${documentBase}/${encoded}?${query}`,
      );
      for (const doc of page.documents || []) {
        ok(doc.name.startsWith(`${documentPrefix}/${uid}/`), 'Unexpected document outside fixture');
        const path = doc.name.slice(documentPrefix.length + 1);
        if (doc.createTime) result.set(path, doc.fields || {});
        let collectionPageToken: string | undefined;
        do {
          const collections = await request<{ collectionIds?: string[]; nextPageToken?: string }>(
            `${documentBase}/${ownedPath(uid, path)}:listCollectionIds`, 'POST',
            { pageSize: 100, ...(collectionPageToken ? { pageToken: collectionPageToken } : {}) },
          );
          for (const child of collections.collectionIds || []) await visitCollection(`${path}/${child}`);
          collectionPageToken = collections.nextPageToken;
        } while (collectionPageToken);
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  await visitCollection(uid);
  return result;
}

async function cleanup(uid: string): Promise<null> {
  const fixture = fixtures.get(uid);
  ok(fixture, 'Cleanup only accepts a UID prepared by this Cypress process');
  const current = await snapshot(uid);
  // Delete children first. Newly discovered documents include any upload metadata or UI defaults.
  for (const path of [...current.keys()].sort((a, b) => b.split('/').length - a.split('/').length)) {
    if (!fixture.initial.has(path)) {
      await request(`${documentBase}/${ownedPath(uid, path)}`, 'DELETE');
    }
  }
  for (const [path, originalFields] of fixture.initial) {
    await request(`${documentBase}/${ownedPath(uid, path)}`, 'PATCH', { fields: originalFields });
  }
  deepStrictEqual(await snapshot(uid), fixture.initial, `Cleanup/restoration failed for ${fixture.caseId}`);
  // The reviewed cases explicitly preserve the test user's account. Only case data are removed.
  fixtures.delete(uid);
  return null;
}

async function prepare(caseId: CaseId) {
  ok(caseIds.includes(caseId), `Unknown functional case: ${caseId}`);
  const email = `e2e-${caseId.toLowerCase()}-${randomUUID()}@example.test`;
  const password = `E2e!${randomUUID()}`;
  const user = await auth<{ localId: string; idToken: string }>('signUp', {
    email, password, returnSecureToken: true,
  });
  const uid = user.localId;
  ok(/^[a-zA-Z0-9_-]+$/.test(uid), 'Unexpected emulator UID');
  fixtures.set(uid, { caseId, initial: new Map(), seeded: new Map() });
  try {
    await auth('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: user.idToken });
    const codes = await request<{ oobCodes: Array<{ email: string; requestType: string; oobCode: string }> }>(
      `${authOrigin}/emulator/v1/projects/${project}/oobCodes`,
    );
    const code = codes.oobCodes.find((item) => item.email === email && item.requestType === 'VERIFY_EMAIL');
    ok(code, 'Verification code for the dedicated user is missing');
    await auth('update', { oobCode: code.oobCode });
    const account = await auth<{ users: Array<{ localId: string; email: string; emailVerified: boolean }> }>(
      'lookup', { idToken: user.idToken },
    );
    strictEqual(account.users[0].localId, uid);
    strictEqual(account.users[0].email, email);
    strictEqual(account.users[0].emailVerified, true, 'P-01 requires a verified email');

    const initial = await snapshot(uid);
    strictEqual(initial.size, 0, 'A new test user must not inherit invoice or consumption data');
    fixtures.set(uid, { caseId, initial, seeded: new Map() });

    if (caseId === 'TP-03') {
      for (const [date, energy] of [
        ['2026-01-01', 10], ['2026-01-02', 20], ['2026-02-01', 5], ['2026-02-02', 15],
      ] as const) {
        await putAndVerify(uid, `poraba/${date.slice(0, 7)}/${date}`, {
          'delta prejeta delovna energija et': energy,
          'delta oddana delovna energija et': 0,
          'poraba et': energy,
        });
      }
    } else if (caseId === 'TP-04') {
      await putAndVerify(uid, 'racuni/2026/01', {
        month: '2026-01', totalAmount: 100, energyCost: 70, networkCost: 20,
        surcharges: 10, penalties: 0, vat: 22, note: '',
      });
      await putAndVerify(uid, 'racuni/2026/02', {
        month: '2026-02', totalAmount: 80, energyCost: 50, networkCost: 25,
        surcharges: 5, penalties: 0, vat: 17.6, note: '',
      });
    } else if (caseId === 'TP-05') {
      // New accounts have no settings. The initial snapshot records this absence for restoration.
      await putAndVerify(uid, 'dogovorjena-moc', { '1': 4000, '2': 4000, '3': 4000, '4': 4000, '5': 4000 });
      // The application API rejects zero; P-05 explicitly permits direct emulator preparation.
      await putAndVerify(uid, 'toplotna-crpalka', { power: 0, 'turn on temparature': 0 });
    }
    return { uid, email, password };
  } catch (error) {
    await cleanup(uid);
    throw error;
  }
}

export function registerFunctionalTasks(on: Cypress.PluginEvents) {
  on('task', {
    'e2e:prepare': prepare,
    'e2e:cleanup': cleanup,
    'e2e:assertFixturesUnchanged': assertFixturesUnchanged,
  });
  // Also cover assertion/hook failures that prevent a spec's normal cleanup from completing.
  on('after:spec', async () => {
    for (const uid of fixtures.keys()) await cleanup(uid);
  });
}
