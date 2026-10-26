const RegisterPage = require('../pages/RegisterPage');

describe('Register', () => {
  const validPassword = 'Str0ng-Pass#2026';
  let registerPage;

  beforeEach(() => {
    registerPage = new RegisterPage().visit();
  });

  it('registers a new user and goes to the feed', () => {
    const uniqueEmail = `user${Date.now()}@test.com`;

    registerPage.register('Test User', uniqueEmail, validPassword, validPassword);

    cy.url().should('include', '/feed');
  });

  it('shows an error when the email is already registered', () => {
    registerPage.registerWithInvalidData(
      'Test User',
      'demo@collectorhub.com',
      validPassword,
      validPassword
    );

    registerPage.getEmailError().should('be.visible');
    cy.url().should('include', '/register');
  });

  it('shows an error when the passwords do not match', () => {
    registerPage.registerWithInvalidData(
      'Test User',
      `user${Date.now()}@test.com`,
      validPassword,
      'Different-Pass#1'
    );

    registerPage.getPasswordError().should('be.visible');
    cy.url().should('include', '/register');
  });

  it('does not submit the form when fields are empty', () => {
    registerPage.submitEmptyForm();

    registerPage.getNameInput().should('match', ':invalid');
    cy.url().should('include', '/register');
  });
});