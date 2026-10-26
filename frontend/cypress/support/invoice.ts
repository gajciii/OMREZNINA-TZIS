export type InvoiceAmounts = {
  totalAmount: number;
  energyCost: number;
  networkCost: number;
  surcharges: number;
  penalties: number;
  vat: number;
  note?: string;
};

const labels = {
  totalAmount: 'Skupni znesek brez DDV',
  energyCost: 'Strošek energije',
  networkCost: 'Omrežnina',
  surcharges: 'Prispevki in ostalo',
  penalties: 'Penali',
  vat: 'DDV',
};

export function selectInvoicePeriod(year: string, month: string) {
  cy.get('[data-cy="receipt-year"] option').filter(`[value="${year}"]`).should('exist');
  cy.get('[data-cy="receipt-year"]').select(year).should('have.value', year);
  cy.get('[data-cy="receipt-month"] option').filter(`[value="${month}"]`).should('exist');
  return cy.get('[data-cy="receipt-month"]').select(month).should('have.value', month);
}

// Assert the visible amount beside its business label, accepting either decimal separator.
export function assertInvoice(expected: InvoiceAmounts) {
  cy.get('[data-cy="receipt-table"]').should('be.visible');
  for (const field of Object.keys(labels) as Array<keyof typeof labels>) {
    cy.get(`[data-cy="receipt-${field}"]`).should('be.visible').within(() => {
      cy.contains('td', labels[field]).should('be.visible');
      cy.get('[data-cy="receipt-value"]').should(($cell) => {
        const text = $cell.text().trim();
        expect(text, `${labels[field]} includes its currency`).to.match(/^-?\d+(?:[.,]\d+)?\s*€$/);
        expect(Number(text.replace(/\s|€/g, '').replace(',', '.')), labels[field]).to.eq(expected[field]);
      });
    });
  }
  if (expected.note !== undefined) {
    cy.get('[data-cy="receipt-note"]').should('be.visible').within(() => {
      cy.contains('td', 'Opomba').should('be.visible');
      cy.get('[data-cy="receipt-value"]').should('have.text', expected.note);
    });
  }
}
