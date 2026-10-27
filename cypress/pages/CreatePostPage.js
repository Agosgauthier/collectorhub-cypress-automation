const FeedPage = require('./FeedPage');

class CreatePostPage {
  // Locators
  get titleInput() {
    return cy.get('[data-testid="create-post-title"]');
  }

  get publishButton() {
    return cy.get('[data-testid="create-post-submit"]');
  }

  get successMessage() {
    return cy.contains('Publicación creada correctamente', {
      timeout: 15000,
    });
  }

  categoryButton(label) {
    const categoryIds = {
      Monedas: 'coins',
    };

    const categoryId = categoryIds[label] || label;

    return cy.get(`[data-testid="create-post-category-${categoryId}"]`);
  }

  // Actions
  visit() {
    cy.visit('/create-post');
    return this;
  }

  fillTitle(title) {
    this.titleInput.type(title);
    return this;
  }

  selectCategory(label) {
    this.categoryButton(label).click();
    return this;
  }

  publish() {
    this.publishButton.click();
    return new FeedPage();
  }
}

module.exports = CreatePostPage;
