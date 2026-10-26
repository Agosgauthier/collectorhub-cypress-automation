const ForgotPasswordPage = require('../pages/ForgotPasswordPage');

describe('Forgot password', () => {
  let forgotPasswordPage;

  beforeEach(() => {
    forgotPasswordPage = new ForgotPasswordPage().visit();
  });

  it('shows a confirmation message for a registered email', () => {
    forgotPasswordPage.requestResetLink('demo@collectorhub.com');

    forgotPasswordPage.getStatusMessage().should('be.visible');
    cy.url().should('include', '/forgot-password');
  });

  it('shows the same message for an email that does not exist', () => {
    forgotPasswordPage.requestResetLink('nobody@example.com');

    forgotPasswordPage.getStatusMessage().should('be.visible');
    cy.url().should('include', '/forgot-password');
  });

  it('shows an error when the email is empty', () => {
    forgotPasswordPage.submitEmptyForm();

    forgotPasswordPage.getEmailError().should('be.visible');
    cy.url().should('include', '/forgot-password');
  });

  it('goes back to the login page', () => {
    forgotPasswordPage.goBackToLogin();

    cy.url().should('include', '/login');
  });
});