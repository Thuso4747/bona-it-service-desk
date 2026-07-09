describe('Client Ticket Flow', () => {
  beforeEach(() => {
    cy.fixture('users').as('users');
    cy.fixture('tickets').as('tickets');
  });

  it('should allow client to submit a ticket and track status', function () {
    cy.visit('/login');
    cy.get('input[name="email"]').type(this.users.client.email);
    cy.get('input[name="password"]').type(this.users.client.password);
    cy.get('button[type="submit"]').click();

    // Submit new ticket
    cy.contains('New Support Ticket').click();
    cy.get('input[name="title"]').type(this.tickets.sampleTicket.title);
    cy.get('select[name="category"]').select(this.tickets.sampleTicket.category);
    cy.get('textarea[name="description"]').type(this.tickets.sampleTicket.description);
    cy.get('button[type="submit"]').click();

    // Verify tracking reference generated
    cy.contains('Tracking Reference').should('exist');

    // Check ticket appears in tracker
    cy.visit('/tickets');
    cy.contains(this.tickets.sampleTicket.title).should('exist');
    cy.contains('CREATED').should('exist');
  });
});