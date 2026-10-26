
const LoginPage = require('../pages/LoginPage');

describe('Login', () => {
  it('logs in with a valid user and shows the feed', () => {
    new LoginPage()
      .visit()
      .login('demo@collectorhub.com', 'password');

    cy.url().should('include', '/feed');
  });

  it('shows an error with a wrong password', () => {
    const loginPage = new LoginPage().visit();
    loginPage.login('demo@collectorhub.com', 'clave-incorrecta');

    cy.url().should('include', '/login');
    loginPage.errorMessage.should('be.visible');
  });

  it('does not allow login with empty fields', () => {
    const loginPage = new LoginPage().visit();

    loginPage.submitButton.click();

    loginPage.emailInput.should('match', ':invalid');
    loginPage.passwordInput.should('match', ':invalid');

    cy.url().should('include', '/login');
  });
});
