
class FeedPage {
  // Locators
  get posts() {
    return cy.get('[data-testid="feed-post"]');
  }

  get postTitles() {
    return this.posts.find('[data-testid="post-title"]');
  }

  get postImages() {
    return this.posts.find('[data-testid="post-image"]');
  }

  get postDescriptions() {
    return this.posts.find('[data-testid="post-description"]');
  }

  get commentButtons() {
    return this.posts.find('[data-testid="post-comments-button"]');
  }

  // Actions
  visit() {
    cy.visit('/feed');
    return this;
  }
}

module.exports = FeedPage;
