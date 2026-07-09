describe('Agent Dashboard Flow', () => {
  it('should allow admin to manage tickets', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@portal.com');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();

    // Access dashboard
    cy.contains('Tickets Table').click();
    cy.contains('Internet not working').click();

    // Assign ticket
    cy.get('select[name="assignedAgent"]').select('Agent1');
    cy.get('button').contains('Save').click();

    // Update status
    cy.get('select[name="status"]').select('IN_PROGRESS');
    cy.get('button').contains('Save').click();
    cy.contains('IN_PROGRESS').should('exist');

    // Resolve ticket
    cy.get('select[name="status"]').select('RESOLVED');
    cy.get('button').contains('Save').click();
    cy.contains('RESOLVED').should('exist');
  });
});