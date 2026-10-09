describe('Lokalna prijava in podatki uporabnika', () => {
  const email = `local-e2e-${Date.now()}@example.test`;
  const password = 'LokalnoGeslo!123';
  const year = `${new Date().getFullYear()}`;
  let uid = '';
  let idToken = '';
  let authEmulatorOrigin = '';

  after(() => {
    if (!uid || !idToken || !authEmulatorOrigin) return;
    // Remove only the account and invoice created by this test.
    cy.request('DELETE', `/api/firestore/remove?uid=${encodeURIComponent(uid)}&docId=racuni`);
    cy.request('POST', `${authEmulatorOrigin}/identitytoolkit.googleapis.com/v1/accounts:delete?key=demo-api-key`, {
      idToken,
    });
  });

  it('registrira in potrdi email ter shrani račun po obnovljeni prijavi z zapomnjeno napravo', () => {
    cy.intercept('POST', '**/accounts:signUp*').as('registration');
    cy.intercept('POST', '**/accounts:signInWithPassword*').as('login');
    cy.visit('/auth/register');
    cy.get('input#name').type('Lokalni preizkus');
    cy.get('input#email').type(email);
    cy.get('input#password').type(password);
    cy.get('input#confirm-password').type(password);
    cy.contains('button', 'Registracija').click();

    cy.wait('@registration').then(({ request, response }) => {
      const authUrl = new URL(request.url);
      expect(authUrl.hostname).to.be.oneOf(['127.0.0.1', 'localhost']);
      expect(response?.statusCode).to.eq(200);
      uid = response?.body.localId;
      idToken = response?.body.idToken;
      authEmulatorOrigin = authUrl.origin;
    });
    cy.contains('a', 'Potrdi lokalni email naslov', { timeout: 15000 }).click();
    cy.location('pathname').should('eq', '/auth/login');
    cy.contains('Email je uspešno potrjen. Sedaj se lahko prijavite.').should('be.visible');

    cy.get('input#email').type(email);
    cy.get('input#password').type(password);
    cy.get('input#remember').check();
    cy.contains('button', 'Prijava').click();
    cy.wait('@login').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.localId).to.eq(uid);
      idToken = response?.body.idToken;
    });
    cy.location('pathname', { timeout: 15000 }).should('eq', '/');

    // Reload restores Firebase's remembered session before protected forms load.
    cy.visit('/upload-reciept');
    cy.reload();
    cy.location('pathname').should('eq', '/upload-reciept');
    cy.contains('Ročni vnos podatkov računa').should('be.visible');
    cy.get('select[id="year"]').filter(':visible').select(year);
    cy.get('select[id="month"]').filter(':visible').select('01');

    const values = { totalAmount: '120', energyCost: '70', networkCost: '20', surcharges: '10', penalties: '0', vat: '20' };
    Object.entries(values).forEach(([field, value]) => {
      cy.get(`input[id="${field}"]`).filter(':visible').type(value);
    });
    cy.get('input[id="note"]').filter(':visible').type('Lokalni preizkus zapomnjene prijave');
    cy.contains('button:visible', 'Shrani račun').click();
    cy.get('p').filter(':visible').contains('Račun uspešno vnešen!').should('be.visible');

    cy.then(() => {
      cy.request(`/api/firestore/data?uid=${encodeURIComponent(uid)}&docId=racuni&subColId=${year}&subColDocId=01`)
        .its('body').should('include', { totalAmount: 120, networkCost: 20 });
    });
    cy.visit('/reciept-explanation');
    cy.get('select').filter(':visible').first().select(year);
    cy.get('select').filter(':visible').eq(1).select('01');
    cy.contains('td', '120 €').should('be.visible');
  });
});
