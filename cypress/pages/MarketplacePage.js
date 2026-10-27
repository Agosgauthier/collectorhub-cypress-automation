class MarketplacePage {
  // Locators
  get pageTitle() {
    return cy.get('main h1');
  }

  get searchInput() {
    return cy.get('#marketplace-search');
  }

  get categorySelect() {
    return cy.get('#marketplace-category');
  }

  get saleTypeSelect() {
    return cy.get('#marketplace-sale-type');
  }

  get dateFilterSelect() {
    return cy.get('#marketplace-date-filter');
  }

  get applyFiltersButton() {
    return cy.contains('form button[type="submit"]', 'Aplicar filtros');
  }

  get clearFiltersButton() {
    return cy.contains('form button[type="button"]', 'Limpiar filtros');
  }

  get listingsHeading() {
    return cy.contains('main h2', 'Coleccionables disponibles');
  }

  get listingCards() {
    return cy.get('main article');
  }

  get listingTitles() {
    return this.listingCards.find('h3');
  }

  get noResultsHeading() {
    return cy.contains('main h3', 'No se encontraron publicaciones');
  }

  // Actions
  visit() {
    cy.visit('/marketplace');
    return this;
  }

  searchFor(term) {
    this.searchInput.clear().type(term);
    return this;
  }

  selectCategory(category) {
    this.categorySelect.select(category);
    return this;
  }

  selectSaleType(saleType) {
    this.saleTypeSelect.select(saleType);
    return this;
  }

  selectDateFilter(dateFilter) {
    this.dateFilterSelect.select(dateFilter);
    return this;
  }

  applyFilters() {
    this.applyFiltersButton.click();
    return this;
  }

  clearFilters() {
    this.clearFiltersButton.click();
    return this;
  }
}

module.exports = MarketplacePage;
