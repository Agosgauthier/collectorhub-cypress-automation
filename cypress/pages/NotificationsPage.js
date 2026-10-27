class NotificationsPage {
  // Locators: this screen currently has no data-testid attributes.
  get pageTitle() {
    return cy.contains('h1', /^Notificaciones$/);
  }

  get allFilterButton() {
    return cy.contains('button', /^Todas \(\d+\)$/);
  }

  get messagesFilterButton() {
    return cy.contains('button', /^Mensajes \(\d+\)$/);
  }

  get marketplaceFilterButton() {
    return cy.contains('button', /^Marketplace \(\d+\)$/);
  }

  get emptyStateMessage() {
    return cy.contains('p', 'No tienes notificaciones en esta sección.');
  }

  get notificationCards() {
    return cy.get('div.cursor-pointer.rounded-2xl');
  }

  get markAllAsReadButton() {
    return cy.contains('button', 'Marcar todas como leídas');
  }

  get followCard() {
    return this.notificationCards.filter(':contains("comenzó a seguirte.")');
  }

  get unreadMessageCard() {
    return this.notificationCards.filter(':contains("E2E message-unread")');
  }

  get readMessageCard() {
    return this.notificationCards.filter(':contains("E2E message-read")');
  }

  get marketplaceCard() {
    return this.notificationCards.filter(':contains("E2E Marketplace")');
  }

  // Actions
  visit() {
    cy.visit('/notifications');
    return this;
  }

  selectAllFilter() {
    this.allFilterButton.click();
    return this;
  }

  selectMessagesFilter() {
    this.messagesFilterButton.click();
    return this;
  }

  selectMarketplaceFilter() {
    this.marketplaceFilterButton.click();
    return this;
  }

  readFollowNotification() {
    this.followCard.click();
    return this;
  }

  markAllAsRead() {
    this.markAllAsReadButton.click();
    return this;
  }

  reload() {
    cy.reload();
    return this;
  }
}

module.exports = NotificationsPage;
