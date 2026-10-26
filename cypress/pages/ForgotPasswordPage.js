const LoginPage = require('./LoginPage');

class ForgotPasswordPage {
  #emailInput = () => cy.get('[data-testid="forgot-password-email"]');
  #submitButton = () => cy.get('[data-testid="forgot-password-submit"]');
  #statusMessage = () => cy.get('[data-testid="forgot-password-status"]');
  #emailError = () => cy.get('[data-testid="forgot-password-email-error"]');
  #loginLink = () => cy.get('[data-testid="forgot-password-login-link"]');

  visit() {
    cy.visit('/forgot-password');
    return this;
  }

  requestResetLink(email) {
    this.#emailInput().clear().type(email);
    this.#submitButton().click();
    return this; 
  }

  submitEmptyForm() {
    this.#submitButton().click();
    return this;
  }

  goBackToLogin() {
    this.#loginLink().click();
    return new LoginPage();
  }

 
  getStatusMessage() {
    return this.#statusMessage();
  }

  getEmailError() {
    return this.#emailError();
  }
}

module.exports = ForgotPasswordPage;