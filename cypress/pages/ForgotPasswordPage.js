const LoginPage = require('./LoginPage');

class ForgotPasswordPage {
  // ---------- Selectors (private, all together at the top) ----------
  #emailInput = () => cy.get('[data-testid="forgot-password-email"]');
  #submitButton = () => cy.get('[data-testid="forgot-password-submit"]');
  #statusMessage = () => cy.get('[data-testid="forgot-password-status"]');
  #emailError = () => cy.get('[data-testid="forgot-password-email-error"]');
  #loginLink = () => cy.get('[data-testid="forgot-password-login-link"]');

  // ---------- User actions ----------
  visit() {
    cy.visit('/forgot-password');
    return this; // we stay on the forgot password page
  }

  requestResetLink(email) {
    this.#emailInput().clear().type(email);
    this.#submitButton().click();
    return this; // the page stays the same and shows a message
  }

  submitEmptyForm() {
    this.#submitButton().click();
    return this; // the server answers with a validation error
  }

  goBackToLogin() {
    this.#loginLink().click();
    return new LoginPage(); // the link takes us to the login page
  }

  // ---------- Things the test can look at ----------
  getStatusMessage() {
    return this.#statusMessage();
  }

  getEmailError() {
    return this.#emailError();
  }
}

module.exports = ForgotPasswordPage;