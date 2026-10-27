const LoginPage = require('../pages/LoginPage');
const MarketplacePage = require('../pages/MarketplacePage');

describe('Marketplace', () => {
  beforeEach(() => {
    new LoginPage()
      .visit()
      .login('demo@collectorhub.com', 'password');

    cy.url().should('include', '/feed');
  });

  it('shows the marketplace and its filters', () => {
    const marketplacePage = new MarketplacePage().visit();

    cy.url().should('include', '/marketplace');
    marketplacePage.pageTitle.should('have.text', 'Marketplace');
    marketplacePage.searchInput.should('be.visible');
    marketplacePage.categorySelect.should('be.visible');
    marketplacePage.saleTypeSelect.should('be.visible');
    marketplacePage.dateFilterSelect.should('be.visible');
    marketplacePage.listingsHeading.should('be.visible');
  });

  it('filters listings by search and clears the filters', () => {
    const marketplacePage = new MarketplacePage().visit();
    const searchTerm = `no-marketplace-match-${Date.now()}`;

    marketplacePage.searchFor(searchTerm).applyFilters();

    cy.location('pathname').should('eq', '/marketplace');
    cy.location('search').should('include', `search=${searchTerm}`);
    marketplacePage.noResultsHeading.should('be.visible');

    marketplacePage.clearFilters();

    cy.location('pathname').should('eq', '/marketplace');
    cy.location('search').should('eq', '');
    marketplacePage.searchInput.should('have.value', '');
  });
});
