describe('Mobile Responsiveness', () => {
  it('should render ticket form correctly on mobile', () => {
    cy.viewport('iphone-6');
    cy.visit('/tickets/new');
    cy.get('input[name="title"]').should('be.visible');
    cy.get('textarea[name="description"]').should('be.visible');
  });

  it('should render dashboard correctly on tablet', () => {
    cy.viewport('ipad-2');
    cy.visit('/dashboard');
    cy.contains('Tickets Table').should('be.visible');
    cy.contains('Users Table').should('be.visible');
  });
});