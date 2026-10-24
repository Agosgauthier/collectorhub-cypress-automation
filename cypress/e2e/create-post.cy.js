const LoginPage = require('../pages/LoginPage');
const CreatePostPage = require('../pages/CreatePostPage');

describe('Create post', () => {
  it('publishes a post and shows it in the feed', () => {
    const title = `Moneda de prueba ${Date.now()}`;

    const feedPage = new LoginPage()
      .visit()
      .login('demo@collectorhub.com', 'password');

    cy.url().should('include', '/feed');

    const createPostPage = new CreatePostPage().visit();
    createPostPage.fillTitle(title).selectCategory('Monedas');
    createPostPage.publish();

    cy.url().should('include', '/feed');
    feedPage.postTitles.should('contain', title);
  });
});