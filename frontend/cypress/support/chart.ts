declare global {
  namespace Cypress {
    interface Chainable {
      hoverChartBar(pointIndex: number, seriesIndex?: number): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// ApexCharts replaces SVG nodes and tooltips on asynchronous React updates. A
// query is retried together with its downstream assertions, so each attempt
// moves over the CURRENT rendered bar rather than waiting on a stale tooltip.
Cypress.Commands.addQuery('hoverChartBar', function (pointIndex: number, seriesIndex = 0) {
  return ($chart: JQuery<HTMLElement>) => {
    const chart = $chart[0];
    const series = chart?.querySelectorAll('.apexcharts-bar-series .apexcharts-series')[seriesIndex];
    const bar = series?.querySelectorAll<SVGPathElement>('.apexcharts-bar-area')[pointIndex];
    if (!bar?.isConnected) return Cypress.$<HTMLElement>();

    const bounds = bar.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return Cypress.$<HTMLElement>();
    expect(Cypress.$(bar), 'rendered chart bar').to.be.visible;

    const view = bar.ownerDocument.defaultView as Window & typeof globalThis;
    const position = {
      bubbles: true,
      cancelable: true,
      view,
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    };
    // Hovering is idempotent: these events only exercise the chart's normal
    // tooltip handlers. No chart state or tooltip contents are set by the test.
    bar.dispatchEvent(new view.MouseEvent('mouseover', position));
    bar.dispatchEvent(new view.MouseEvent('mousemove', position));

    return Cypress.$<HTMLElement>(chart.querySelectorAll<HTMLElement>('.apexcharts-tooltip'));
  };
});

/** Hover a real rendered bar and keep hovering if a later assertion retries. */
export function hoverBar(chartSelector: string, pointIndex: number, seriesIndex = 0) {
  cy.get(chartSelector).should('be.visible').scrollIntoView();
  return cy.get(chartSelector).hoverChartBar(pointIndex, seriesIndex).should('be.visible');
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
  hoverBar('[data-cy="monthly-consumption-chart"]', pointIndex).should(($tooltip) => {
    expect($tooltip.find('[data-cy="monthly-tooltip-period"]')).to.have.text(period);
    Object.entries(expected).forEach(([series, value]) => {
      const $value = $tooltip.find(`[data-cy="monthly-tooltip-${series}"]`);
      expect($value).to.be.visible;
      expect($value).to.have.text(`${value.toFixed(2)} kWh`);
    });
  });
}
