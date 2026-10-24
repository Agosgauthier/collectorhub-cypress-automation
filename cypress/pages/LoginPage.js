const FeedPage = require('./FeedPage');

class LoginPage {
  // Locators
  get emailInput() {
    return cy.get('#email');
  }

  get passwordInput() {
    return cy.get('#password');
  }

  get submitButton() {
    return cy.contains('button[type="submit"]', 'Iniciar sesión');
  }

  get errorMessage() {
    return cy.get('p.text-red-600');
  }

  // Actions
  visit() {
    cy.visit('/login');
    return this;
  }

  login(email, password) {
    this.emailInput.type(email);
    this.passwordInput.type(password, { log: false });
    this.submitButton.click();
    return new FeedPage();
  }
}

module.exports = LoginPage;