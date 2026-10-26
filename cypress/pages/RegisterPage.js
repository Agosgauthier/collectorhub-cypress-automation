const FeedPage = require('./FeedPage');

class RegisterPage {
  // ---------- Selectors (private, all together at the top) ----------
  #nameInput = () => cy.get('[data-testid="register-name"]');
  #emailInput = () => cy.get('[data-testid="register-email"]');
  #passwordInput = () => cy.get('[data-testid="register-password"]');
  #passwordConfirmationInput = () => cy.get('[data-testid="register-password-confirmation"]');
  #submitButton = () => cy.get('[data-testid="register-submit"]');
  #emailError = () => cy.get('[data-testid="register-email-error"]');
  #passwordError = () => cy.get('[data-testid="register-password-error"]');

  // ---------- User actions ----------
  visit() {
    cy.visit('/register');
    return this; // we stay on the register page
  }

  register(name, email, password, passwordConfirmation) {
    this.#fillForm(name, email, password, passwordConfirmation);
    this.#submitButton().click();
    return new FeedPage(); // a new account takes us to the feed
  }

  registerWithInvalidData(name, email, password, passwordConfirmation) {
    this.#fillForm(name, email, password, passwordConfirmation);
    this.#submitButton().click();
    return this; // we stay on the register page
  }

  submitEmptyForm() {
    this.#submitButton().click();
    return this; // the browser blocks the submit, we stay here
  }

  // ---------- Things the test can look at ----------
  getNameInput() {
    return this.#nameInput();
  }

  getEmailError() {
    return this.#emailError();
  }

  getPasswordError() {
    return this.#passwordError();
  }

  // ---------- Private helper ----------
  #fillForm(name, email, password, passwordConfirmation) {
    this.#nameInput().clear().type(name);
    this.#emailInput().clear().type(email);
    this.#passwordInput().clear().type(password, { log: false });
    this.#passwordConfirmationInput().clear().type(passwordConfirmation, { log: false });
  }
}

module.exports = RegisterPage;