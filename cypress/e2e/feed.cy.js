const LoginPage = require('../pages/LoginPage');

describe('KAN-40 - Feed visualization', () => {
  it('shows the feed with posts after a valid login', () => {
    const loginPage = new LoginPage();
    const feedPage = loginPage
      .visit()
      .login('demo@collectorhub.com', 'password');

    cy.url().should('include', '/feed');

    feedPage.posts.should('have.length.greaterThan', 0);
    feedPage.postTitles.first().should('be.visible');
    feedPage.postImages.should('have.length.greaterThan', 0);
    feedPage.postDescriptions.should('have.length.greaterThan', 0);
    feedPage.commentButtons.first().should('be.visible');
  });
});