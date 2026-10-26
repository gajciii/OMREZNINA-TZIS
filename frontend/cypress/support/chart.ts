/** Hover the rendered bar, then read the same tooltip shown to a user. */
export function hoverBar(chartSelector: string, pointIndex: number, seriesIndex = 0) {
  cy.get(chartSelector).should('be.visible').scrollIntoView();
  cy.get(chartSelector)
    .find('.apexcharts-bar-series .apexcharts-series')
    .eq(seriesIndex)
    .find('.apexcharts-bar-area')
    .eq(pointIndex)
    .should('be.visible')
    .trigger('mouseover', { eventConstructor: 'MouseEvent', force: true })
    .trigger('mousemove', 'center', { eventConstructor: 'MouseEvent', force: true });
  return cy.get(`${chartSelector} .apexcharts-tooltip`).should('be.visible');
}

/** The label's SVG anchor gives the actual data-point x coordinate after layout. */
export function hoverLineDay(chartSelector: string, day: string) {
  cy.get(chartSelector).should('be.visible').scrollIntoView();
  cy.contains(`${chartSelector} .apexcharts-xaxis-label`, day).then(($label) => {
    const label = $label[0] as unknown as SVGTextElement;
    const point = label.ownerSVGElement!.createSVGPoint();
    point.x = Number(label.getAttribute('x'));
    point.y = Number(label.getAttribute('y'));
    // Ignore the label's decorative rotation: the parent maps its data anchor.
    const screenPoint = point.matrixTransform((label.parentNode as SVGGraphicsElement).getScreenCTM()!);
    cy.get(chartSelector).find('.apexcharts-grid').then(($grid) => {
      const bounds = $grid[0].getBoundingClientRect();
      cy.get(chartSelector).find('.apexcharts-svg').trigger('mousemove', {
        clientX: Math.max(bounds.left + 1, Math.min(bounds.right - 1, screenPoint.x)),
        clientY: bounds.top + bounds.height / 2,
        eventConstructor: 'MouseEvent',
        force: true,
      });
    });
  });
  return cy.get(`${chartSelector} .apexcharts-tooltip`).should('be.visible');
}

export function assertMonthlyValues(
  pointIndex: number,
  period: string,
  expected: { consumption: number; imported: number; exported: number },
) {
  hoverBar('[data-cy="monthly-consumption-chart"]', pointIndex).within(() => {
    cy.get('[data-cy="monthly-tooltip-period"]').should('have.text', period);
    Object.entries(expected).forEach(([series, value]) => {
      cy.get(`[data-cy="monthly-tooltip-${series}"]`)
        .should('be.visible')
        .and('have.text', `${value.toFixed(2)} kWh`);
    });
  });
}
