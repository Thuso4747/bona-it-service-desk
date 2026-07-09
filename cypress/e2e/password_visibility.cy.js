describe('Password Visibility Test', () => {
  it('should show user password as read-only', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@portal.com');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();

    cy.contains('Users Table').click();
    cy.contains('client@test.com').click();

    // Verify password field is visible but disabled
    cy.get('input[name="password"]').should('be.disabled');
    cy.get('input[name="password"]').should('have.value', 'client123');
  });
});