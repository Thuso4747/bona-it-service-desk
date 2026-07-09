const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // adjust if deployed
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed
    },
  },
});