const FeedPage = require('./FeedPage');

class CreatePostPage {
  // Locators
  get titleInput() {
    return cy.get('input[placeholder^="Ej: Moneda de 1 peso"]');
  }

  get publishButton() {
    return cy.contains('button[type="submit"]', /Publicar|Publicando/);
  }
  
  get successMessage() {
    return cy.contains('Publicación creada correctamente', { timeout: 15000 });
   }

  categoryButton(label) {
    return cy.contains('button[type="button"]', label);
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