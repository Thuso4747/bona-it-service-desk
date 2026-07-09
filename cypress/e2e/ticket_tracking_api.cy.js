describe('Ticket Tracking API', () => {
  it('should normalize tracking token', () => {
    cy.request('/api/tickets/status/a1b2c3d4').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.ticketRef).to.eq('TKT-A1B2C3D4');
    });
  });

  it('should return error for invalid token', () => {
    cy.request({ url: '/api/tickets/status/invalidtoken', failOnStatusCode: false })
      .then((response) => {
        expect(response.status).to.eq(404);
      });
  });
});