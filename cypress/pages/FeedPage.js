class FeedPage {
  // Locators
  get posts() {
    return cy.get('div[id^="post-"]');
  }

  get postTitles() {
    return this.posts.find('a[href^="/posts/"] h2');
  }

  get postImages() {
    return this.posts.find('a[href^="/posts/"] img');
  }

  get postDescriptions() {
    return this.posts.find('p');
  }

  get commentButtons() {
    return this.posts.find('button:has(svg.lucide-message-circle)');
  }

  // Actions
  visit() {
    cy.visit('/feed');
    return this;
  }
}

module.exports = FeedPage;