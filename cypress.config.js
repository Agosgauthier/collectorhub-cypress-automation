const { defineConfig } = require('cypress');
const { createNotificationsTasks, cleanupNotificationsContexts } = require('./cypress/tasks/notificationsData');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:8000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    defaultCommandTimeout: 30000,
    pageLoadTimeout: 60000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      on('task', createNotificationsTasks(config.baseUrl));
      on('after:spec', () => cleanupNotificationsContexts(config.baseUrl));
      return config;
    },
  },
});
