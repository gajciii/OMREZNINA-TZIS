export type FunctionalCaseId = 'TP-01' | 'TP-02' | 'TP-03' | 'TP-04' | 'TP-05';
export type FunctionalUser = { uid: string; email: string; password: string };

export function prepareCase(caseId: FunctionalCaseId): Cypress.Chainable<FunctionalUser> {
  const origin = new URL(Cypress.config('baseUrl') || '');
  expect(origin.protocol, 'functional tests use the local application').to.eq('http:');
  expect(origin.hostname, 'functional tests use the local application').to.be.oneOf(['127.0.0.1', 'localhost']);
  cy.log(`${caseId}: priprava in preverjanje predpogojev v lokalnih emulatorjih`);
  return cy.task<FunctionalUser>('e2e:prepare', caseId, { log: false, timeout: 60000 });
}

export function login(user: FunctionalUser) {
  cy.intercept('POST', '**/accounts:signInWithPassword*', (request) => {
    expect(new URL(request.url).origin, 'login must reach the local emulator').to.eq('http://127.0.0.1:9099');
  }).as('functionalLogin');
  cy.visit('/auth/login');
  cy.get('input#email').clear().type(user.email);
  cy.get('input#password').clear().type(user.password, { log: false });
  cy.get('input#remember').check();
  cy.contains('button', /^Prijava$/).click();
  cy.wait('@functionalLogin').then(({ response }) => {
    expect(response?.statusCode).to.eq(200);
    expect(response?.body.localId).to.eq(user.uid);
  });
  return cy.location('pathname', { timeout: 15000 }).should('eq', '/');
}

export function cleanupCase(user: FunctionalUser | undefined) {
  if (!user) return cy.wrap(null, { log: false });
  // Leave data-changing components before removing fixtures (e.g. invoice auto-save timers).
  cy.visit('/auth/login');
  return cy.task<null>('e2e:cleanup', user.uid, { log: false, timeout: 60000 });
}

export function assertFixturesUnchanged(user: FunctionalUser | undefined) {
  if (!user) throw new Error('A prepared user is required to verify the final stored state');
  return cy.task<null>('e2e:assertFixturesUnchanged', user.uid, { log: false, timeout: 60000 });
}
