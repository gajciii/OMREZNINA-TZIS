import { prepareCase, login, cleanupCase, type FunctionalUser } from '../support/functional';
import { assertMonthlyValues } from '../support/chart';

describe('TP-02: Uvoz dnevnih stanj iz datoteke CSV', () => {
  let user: FunctionalUser;

  beforeEach(() => {
    prepareCase('TP-02').then((prepared) => {
      user = prepared;
      return login(user);
    });
  });

  afterEach(() => {
    if (!user) return;
    cleanupCase(user);
  });

  it('uvozi točen CSV ter ohrani 12/1/11 kWh po osvežitvi', () => {
    // P-01/P-03: prepareCase verifies an empty January 2025 for this user's UID.
    cy.log('TP-02.1: Odpri obrazec za dnevna stanja');
    cy.visit('/upload-data');
    cy.contains('button', 'Naloži dnevna stanja').click();
    cy.get('[data-cy="daily-upload-file"]').filter(':visible').should('be.visible');

    cy.log('TP-02.2: Izberi podprti CSV in počakaj na dejansko obdelavo');
    cy.intercept('POST', '**/user/upload-file').as('csvUpload');
    cy.get('[data-cy="daily-upload-file"]').filter(':visible').selectFile('cypress/fixtures/poraba_tp02.csv');
    cy.contains('p:visible', 'Izbrana datoteka: poraba_tp02.csv').should('be.visible');
    cy.contains('button:visible', 'Naloži csv ali excel').click();
    cy.wait('@csvUpload', { responseTimeout: 120000 }).its('response.statusCode').should('eq', 200);
    cy.get('[data-cy="daily-upload-success"]').filter(':visible')
      .should('contain.text', 'Podatki uspešno naloženi ali posodobljeni.');
    cy.get('[data-cy="daily-upload-error"]').should('not.exist');

    cy.log('TP-02.3–4: Izberi 2025 in preveri januarske vrednosti v grafu');
    cy.visit('/monthly-consumption');
    cy.get('[data-cy="consumption-year"]').select('2025').should('have.value', '2025');
    cy.get('[data-cy="consumption-month"]').should('have.value', '2025-01');
    assertMonthlyValues(0, 'januar 2025', { imported: 12, exported: 1, consumption: 11 });

    cy.log('TP-02.5: Po osvežitvi podatki ostanejo enaki, brez podvajanja');
    cy.reload();
    cy.get('[data-cy="consumption-year"]').select('2025');
    cy.get('[data-cy="consumption-month"]').select('2025-01');
    assertMonthlyValues(0, 'januar 2025', { imported: 12, exported: 1, consumption: 11 });
  });
});
