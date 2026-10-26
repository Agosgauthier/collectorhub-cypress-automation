const FeedPage = require('./FeedPage');

class RegisterPage {
  #nameInput = () => cy.get('[data-testid="register-name"]');
  #emailInput = () => cy.get('[data-testid="register-email"]');
  #passwordInput = () => cy.get('[data-testid="register-password"]');
  #passwordConfirmationInput = () => cy.get('[data-testid="register-password-confirmation"]');
  #submitButton = () => cy.get('[data-testid="register-submit"]');
  #emailError = () => cy.get('[data-testid="register-email-error"]');
  #passwordError = () => cy.get('[data-testid="register-password-error"]');

  visit() {
    cy.visit('/register');
    return this; 
  }

  register(name, email, password, passwordConfirmation) {
    this.#fillForm(name, email, password, passwordConfirmation);
    this.#submitButton().click();
    return new FeedPage(); 
  }

  registerWithInvalidData(name, email, password, passwordConfirmation) {
    this.#fillForm(name, email, password, passwordConfirmation);
    this.#submitButton().click();
    return this; 
  }

  submitEmptyForm() {
    this.#submitButton().click();
    return this;
  }

  getNameInput() {
    return this.#nameInput();
  }

  getEmailError() {
    return this.#emailError();
  }

  getPasswordError() {
    return this.#passwordError();
  }

  #fillForm(name, email, password, passwordConfirmation) {
    this.#nameInput().clear().type(name);
    this.#emailInput().clear().type(email);
    this.#passwordInput().clear().type(password, { log: false });
    this.#passwordConfirmationInput().clear().type(passwordConfirmation, { log: false });
  }
}

module.exports = RegisterPage;