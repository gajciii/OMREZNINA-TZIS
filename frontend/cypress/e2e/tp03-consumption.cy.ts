import { prepareCase, login, cleanupCase, assertFixturesUnchanged, type FunctionalUser } from '../support/functional';
import { assertMonthlyValues, hoverLineDay } from '../support/chart';

function assertDay(day: string, imported: number) {
  hoverLineDay('[data-cy="daily-consumption-chart"]', day).within(() => {
    cy.get('.apexcharts-tooltip-title').should('have.text', day);
    cy.contains('.apexcharts-tooltip-series-group', 'Prejeta energija (kWh)')
      .should('be.visible')
      .find('.apexcharts-tooltip-text-y-value')
      .should('have.text', `${imported.toFixed(2)} kWh`);
    cy.contains('.apexcharts-tooltip-series-group', 'Oddana solarna (kWh)')
      .should('be.visible')
      .find('.apexcharts-tooltip-text-y-value')
      .should('have.text', '0.00 kWh');
  });
}

describe('TP-03: Pravilen prikaz mesečne porabe elektrike', () => {
  let user: FunctionalUser;

  beforeEach(() => {
    prepareCase('TP-03').then((prepared) => {
      user = prepared;
      return login(user);
    });
  });

  afterEach(() => {
    if (!user) return;
    cleanupCase(user);
  });

  it('prikaže vsoti 30/20 kWh in pravilno loči dnevne podatke obeh mesecev', () => {
    // P-04 is seeded independently of TP-02 and read back before this UI flow.
    cy.log('TP-03.1: Izberi leto 2026 z januarjem in februarjem');
    cy.visit('/monthly-consumption');
    cy.get('[data-cy="consumption-year"]').select('2026').should('have.value', '2026');
    cy.get('[data-cy="consumption-month"] option').should(($options) => {
      expect(Array.from($options, (option) => (option as HTMLOptionElement).value))
        .to.deep.equal(['2026-01', '2026-02']);
    });

    cy.log('TP-03.2–3: Preveri obe mesečni vsoti v grafu');
    assertMonthlyValues(0, 'januar 2026', { imported: 30, exported: 0, consumption: 30 });
    assertMonthlyValues(1, 'februar 2026', { imported: 20, exported: 0, consumption: 20 });

    cy.log('TP-03.4: Januar vsebuje 10/20 kWh prejete in 0 kWh oddane energije');
    cy.get('[data-cy="consumption-month"]').select('2026-01');
    cy.get('[data-cy="daily-consumption-period"]').should('contain.text', 'januar 2026');
    assertDay('2026-01-01', 10);
    assertDay('2026-01-02', 20);

    cy.log('TP-03.5: Februar vsebuje samo 5/15 kWh in nima januarskih podatkov');
    cy.get('[data-cy="consumption-month"]').select('2026-02');
    cy.get('[data-cy="daily-consumption-period"]').should('contain.text', 'februar 2026');
    cy.get('[data-cy="daily-consumption-chart"] .apexcharts-xaxis-label').should(($labels) => {
      expect($labels).to.have.length(2);
      expect($labels.toArray().map((label) => label.textContent).join(' ')).not.to.include('2026-01');
    });
    assertDay('2026-02-01', 5);
    assertDay('2026-02-02', 15);

    cy.log('Končno stanje: štirje pripravljeni dnevni zapisi ostanejo nespremenjeni');
    assertFixturesUnchanged(user);
  });
});
