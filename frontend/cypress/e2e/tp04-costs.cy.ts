import { cleanupCase, login, prepareCase, assertFixturesUnchanged, type FunctionalUser } from '../support/functional';
import { assertInvoice, selectInvoicePeriod } from '../support/invoice';

describe('TP-04: Ločen prikaz stroškov energije in omrežnine', () => {
  let user: FunctionalUser | undefined;

  beforeEach(() => {
    user = undefined;
    return prepareCase('TP-04').then((prepared) => {
      user = prepared;
      return login(prepared);
    });
  });

  afterEach(() => {
    if (user) return cleanupCase(user);
  });

  it('prikaže ločene označene zneske in jih ob preklopu na februar zamenja', () => {
    cy.log('Korak 1: neodvisno pripravljen račun za januar 2026');
    cy.visit('/reciept-explanation');
    cy.contains('h5', 'Račun na kratko').should('be.visible');
    selectInvoicePeriod('2026', '01');

    cy.log('Koraka 2 in 3: ločeni energija in omrežnina ter vse preostale postavke');
    assertInvoice({ totalAmount: 100, energyCost: 70, networkCost: 20, surcharges: 10, penalties: 0, vat: 22 });

    cy.log('Korak 4: februar nadomesti januarske vrednosti v istih vrsticah');
    cy.get('[data-cy="receipt-month"]').select('02').should('have.value', '02');
    assertInvoice({ totalAmount: 80, energyCost: 50, networkCost: 25, surcharges: 5, penalties: 0, vat: 17.6 });
    cy.get('[data-cy="receipt-energyCost"] [data-cy="receipt-value"]').should('not.have.text', '70 €');
    cy.get('[data-cy="receipt-networkCost"] [data-cy="receipt-value"]').should('not.have.text', '20 €');

    cy.log('Končno stanje: oba pripravljena računa ostaneta nespremenjena');
    assertFixturesUnchanged(user);
  });
});
