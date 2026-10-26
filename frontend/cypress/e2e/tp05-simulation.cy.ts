import { cleanupCase, login, prepareCase, type FunctionalUser } from '../support/functional';
import { hoverBar } from '../support/chart';

const device = (name: 'TV' | 'Sušilni stroj') =>
  cy.contains('[data-cy="simulation-device"]', new RegExp(`^${name} \\(`));

function assertSimulation(watts: number, status: 'V REDU' | 'PREKORAČITEV', devices: string[]) {
  cy.wait('@simulation').then(({ request, response }) => {
    expect(request.body.selectedDevices).to.have.members(devices);
    expect(response?.statusCode).to.eq(200);
  });
  // Each simulation subsequently updates the price, then fetches the tariff.
  // Finish that sequence before checking/hovering a chart that those updates rerender.
  cy.wait('@tariff').then(({ response }) => {
    expect(response?.statusCode).to.eq(200);
    cy.contains('[data-cy="simulation-result"] p', `Tarifa: ${response?.body.type}`).should('be.visible');
  });
  cy.get('[data-cy="simulation-result"]').should('be.visible');
  cy.get('[data-cy="simulation-agreed-power"]').should('have.text', 'Dogovorjena moč: 4000 W (4 kW)');
  cy.get('[data-cy="simulation-total-power"]').should('have.text', `Poraba: ${watts} W (${(watts / 1000).toFixed(2)} kW)`);
  cy.get('[data-cy="simulation-status"]').should('have.text', status);
}

describe('TP-05: Simulacija uporabe naprav in zaznava prekoračitve', () => {
  let user: FunctionalUser | undefined;

  beforeEach(() => {
    user = undefined;
    return prepareCase('TP-05').then((prepared) => {
      user = prepared;
      return login(prepared);
    });
  });

  afterEach(() => {
    if (user) return cleanupCase(user);
  });

  it('preveri moč pod mejo, na meji in nad njo, graf ter vrnitev pod mejo', () => {
    cy.intercept('GET', '**/api/simulation/available-devices').as('devices');
    cy.intercept({ method: 'GET', pathname: '/api/firestore/data', query: { docId: 'dogovorjena-moc' } }).as('agreedPower');
    cy.intercept('GET', '**/toplotna/get-current-working-power*').as('heatPump');
    cy.intercept('POST', '**/api/simulation/simulate').as('simulation');
    cy.intercept('GET', '**/power/tariff*').as('tariff');
    cy.visit('/simulate-power');
    cy.wait('@devices').its('response.statusCode').should('eq', 200);
    cy.wait('@agreedPower').its('response.body').should('deep.equal', { 1: 4000, 2: 4000, 3: 4000, 4: 4000, 5: 4000 });
    cy.wait('@heatPump').its('response.body').should('eq', 0);
    cy.get('[data-cy="simulation-device"][aria-pressed="true"]').should('not.exist');
    cy.get('[data-cy="simulation-result"]').should('not.exist');

    cy.log('Korak 1: samo TV, 400 W in V REDU');
    device('TV').click().should('have.attr', 'aria-pressed', 'true');
    assertSimulation(400, 'V REDU', ['TV']);

    cy.log('Korak 2: samo sušilni stroj, točno 4000 W in V REDU');
    device('TV').click().should('have.attr', 'aria-pressed', 'false');
    device('Sušilni stroj').click().should('have.attr', 'aria-pressed', 'true');
    assertSimulation(4000, 'V REDU', ['Sušilni stroj']);

    cy.log('Korak 3: sušilni stroj in TV, 4400 W in PREKORAČITEV');
    device('TV').click().should('have.attr', 'aria-pressed', 'true');
    assertSimulation(4400, 'PREKORAČITEV', ['Sušilni stroj', 'TV']);

    cy.log('Korak 4: dejansko prikazani vrednosti primerjalnega grafa');
    hoverBar('[data-cy="simulation-chart"]', 0).should(($tooltip) => {
      expect($tooltip.find('.apexcharts-tooltip-title')).to.have.text('Dogovorjena moč');
      expect($tooltip.find('.apexcharts-tooltip-text-y-value')).to.be.visible;
      expect($tooltip.find('.apexcharts-tooltip-text-y-value')).to.have.text('4 kW');
    });
    hoverBar('[data-cy="simulation-chart"]', 1).should(($tooltip) => {
      expect($tooltip.find('.apexcharts-tooltip-title')).to.have.text('Poraba');
      expect($tooltip.find('.apexcharts-tooltip-text-y-value')).to.be.visible;
      expect($tooltip.find('.apexcharts-tooltip-text-y-value')).to.have.text('4.4 kW');
    });

    cy.log('Korak 5: po odstranitvi sušilnega stroja ostane TV in V REDU');
    device('Sušilni stroj').click().should('have.attr', 'aria-pressed', 'false');
    device('TV').should('have.attr', 'aria-pressed', 'true');
    assertSimulation(400, 'V REDU', ['TV']);

    cy.log('Čiščenje izbire naprav; fixture nato obnovi prvotne nastavitve');
    device('TV').click().should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-cy="simulation-result"]').should('not.exist');
  });
});
