import { cleanupCase, login, prepareCase, type FunctionalUser } from '../support/functional';
import { assertInvoice, selectInvoicePeriod } from '../support/invoice';

describe('TP-01: Ročni vnos in shranjevanje računa', () => {
  let user: FunctionalUser | undefined;
  const invoice = {
    totalAmount: 100,
    energyCost: 70,
    networkCost: 20,
    surcharges: 10,
    penalties: 0,
    vat: 22,
    note: 'Testni račun TP-01',
  };

  beforeEach(() => {
    user = undefined;
    return prepareCase('TP-01').then((prepared) => {
      user = prepared;
      return login(prepared);
    });
  });

  afterEach(() => {
    if (user) return cleanupCase(user);
  });

  it('shrani januarski račun z vsemi postavkami in ohrani podatke po osvežitvi', () => {
    cy.log('Korak 1: obrazec za ročni vnos');
    cy.visit('/upload-reciept');
    cy.contains('h5', 'Ročni vnos podatkov računa').should('be.visible');

    cy.log('Korak 2: januar 2026 in točni podatki TP-01');
    cy.get('[data-cy="manual-invoice-form"]').filter(':visible').should('have.length', 1).within(() => {
      cy.get('[data-cy="invoice-year"]').select('2026').should('have.value', '2026');
      cy.get('[data-cy="invoice-month"]').select('01').should('have.value', '01');
      Object.entries(invoice).forEach(([field, value]) => {
        cy.get(`[data-cy="invoice-${field}"]`).clear().type(String(value)).should('have.value', String(value));
      });
    });

    // The form also autosaves. Only a complete payload qualifies, and the explicit
    // submit confirmation plus the subsequent UI read prove the documented action.
    cy.intercept('POST', '**/firestore/manual', (request) => {
      if (request.body.month === '2026-01' &&
          Object.entries(invoice).every(([key, value]) => request.body[key] === value)) {
        request.alias = 'completeInvoice';
      }
    });
    cy.log('Korak 3: izrecno shranjevanje in potrditev');
    cy.get('[data-cy="manual-invoice-form"]').filter(':visible').within(() => {
      cy.contains('button', 'Shrani račun').click();
    });
    cy.wait('@completeInvoice').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy="invoice-save-success"]').should('be.visible').and('contain.text', 'Račun uspešno vnešen!');

    cy.log('Korak 4: vse shranjene vrednosti v pregledu računa');
    cy.visit('/reciept-explanation');
    selectInvoicePeriod('2026', '01');
    assertInvoice(invoice);

    cy.log('Korak 5: osvežitev, ponovna izbira obdobja in enake vrednosti');
    cy.reload();
    selectInvoicePeriod('2026', '01');
    assertInvoice(invoice);
  });
});
