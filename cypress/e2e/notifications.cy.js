const LoginPage = require('../pages/LoginPage');
const NotificationsPage = require('../pages/NotificationsPage');

// The helper returns database values; all assertions remain in this spec.
function expectDatabaseState(context, expected) {
  return cy.task('notifications:inspect', { context }).then((state) => {
    expect(state.ok).to.eq(true);
    expect(state.userCount).to.eq(3);
    expect(state.taggedNotificationCount).to.eq(Object.keys(expected).length);
    expect(state.notifications).to.have.length(Object.keys(expected).length);
    expect(state.notifications.map((item) => item.key)).to.have.members(Object.keys(expected));
    state.notifications.forEach((item) => {
      expect(item.is_read, item.key).to.eq(expected[item.key]);
    });
  });
}

const initialState = {
  follow: false,
  'message-unread': false,
  'message-read': true,
  marketplace: false,
  'other-follow': false,
};

// Separate suites select their dataset explicitly, without inspecting test titles.
function notificationsSuite(scenario, defineTests) {
  describe(`Notifications - ${scenario}`, () => {
    let context;
    let page;

    beforeEach(() => {
      context = undefined;
      page = new NotificationsPage();
      cy.task('notifications:check').then((result) => {
        expect(result.ok).to.eq(true);
        expect(result.database).to.eq('coleccionistas_e2e');
        expect(result.serverVerified).to.eq(true);
        expect(result.writesEnabled).to.eq(true);
      });
      cy.task('notifications:context').then((value) => {
        context = value;
        // Keep the context before preparation, including when preparation fails.
        return cy.task('notifications:prepare', { context, scenario }, { log: false });
      }).then((data) => {
        new LoginPage().visit().login(data.email, data.password);
        cy.location('pathname').should('eq', '/feed');
        page.visit();
      });
    });

    afterEach(() => {
      if (!context) return;
      cy.task('notifications:cleanup', { context }).then((result) => {
        expect(result.ok).to.eq(true);
        expect(result.remainingUsers).to.eq(0);
        expect(result.remainingNotifications).to.eq(0);
      });
      cy.task('notifications:inspect', { context }).then((state) => {
        expect(state.userCount).to.eq(0);
        expect(state.taggedNotificationCount).to.eq(0);
        expect(state.notifications).to.deep.eq([]);
      });
    });

    defineTests(() => page, () => context);
  });
}

notificationsSuite('empty', (getPage, getContext) => {
  it('allows authenticated access and shows the title and all three filters', () => {
    const page = getPage();
    cy.location('pathname').should('eq', '/notifications');
    page.pageTitle.should('be.visible').and('have.text', 'Notificaciones');
    page.allFilterButton.should('be.visible').and('have.text', 'Todas (0)');
    page.messagesFilterButton.should('be.visible').and('have.text', 'Mensajes (0)');
    page.marketplaceFilterButton.should('be.visible').and('have.text', 'Marketplace (0)');
  });

  it('shows an empty list in every filter despite another user having a notification', () => {
    const page = getPage();
    page.emptyStateMessage.should('be.visible');
    page.notificationCards.should('not.exist');
    page.markAllAsReadButton.should('not.exist');
    page.selectMessagesFilter();
    page.emptyStateMessage.should('be.visible');
    page.notificationCards.should('not.exist');
    page.selectMarketplaceFilter();
    page.emptyStateMessage.should('be.visible');
    page.notificationCards.should('not.exist');
    page.selectAllFilter();
    page.emptyStateMessage.should('be.visible');
    expectDatabaseState(getContext(), { 'other-follow': false });
  });
});

notificationsSuite('mixed', (getPage, getContext) => {
  it('shows pending and read cards with unread counters', () => {
    const page = getPage();
    page.notificationCards.should('have.length', 4);
    page.allFilterButton.should('have.text', 'Todas (3)');
    page.messagesFilterButton.should('have.text', 'Mensajes (1)');
    page.marketplaceFilterButton.should('have.text', 'Marketplace (1)');
    page.followCard.should('have.class', 'bg-[#cfead8]');
    page.unreadMessageCard.should('have.class', 'bg-[#cfead8]');
    page.marketplaceCard.should('have.class', 'bg-[#cfead8]');
    page.readMessageCard.should('have.class', 'bg-white');
    page.emptyStateMessage.should('not.exist');
    page.markAllAsReadButton.should('be.visible');
    expectDatabaseState(getContext(), initialState);
  });

  it('selects each filter and includes read messages in the filtered data', () => {
    const page = getPage();
    page.allFilterButton.should('have.class', 'bg-[#016E2F]');
    page.selectMessagesFilter();
    page.messagesFilterButton.should('have.class', 'bg-[#016E2F]');
    page.allFilterButton.should('have.class', 'bg-white');
    page.marketplaceFilterButton.should('have.class', 'bg-white');
    page.notificationCards.should('have.length', 2);
    page.unreadMessageCard.should('be.visible');
    page.readMessageCard.should('be.visible');
    page.followCard.should('not.exist');
    page.marketplaceCard.should('not.exist');

    page.selectMarketplaceFilter();
    page.marketplaceFilterButton.should('have.class', 'bg-[#016E2F]');
    page.messagesFilterButton.should('have.class', 'bg-white');
    page.allFilterButton.should('have.class', 'bg-white');
    page.notificationCards.should('have.length', 1);
    page.marketplaceCard.should('be.visible');
    page.unreadMessageCard.should('not.exist');
    page.readMessageCard.should('not.exist');
    page.followCard.should('not.exist');

    page.selectAllFilter();
    page.allFilterButton.should('have.class', 'bg-[#016E2F]');
    page.messagesFilterButton.should('have.class', 'bg-white');
    page.marketplaceFilterButton.should('have.class', 'bg-white');
    page.notificationCards.should('have.length', 4);
    cy.location('pathname').should('eq', '/notifications');
    expectDatabaseState(getContext(), initialState);
  });

  it('persists individual reading after reload without modifying other notifications', () => {
    const page = getPage();
    page.followCard.should('have.class', 'bg-[#cfead8]');
    expectDatabaseState(getContext(), initialState);
    page.readFollowNotification();
    page.followCard.should('have.class', 'bg-white');
    page.allFilterButton.should('have.text', 'Todas (2)');
    page.reload();
    page.followCard.should('have.class', 'bg-white');
    page.notificationCards.should('have.length', 4);
    page.allFilterButton.should('have.text', 'Todas (2)');
    page.messagesFilterButton.should('have.text', 'Mensajes (1)');
    page.marketplaceFilterButton.should('have.text', 'Marketplace (1)');
    expectDatabaseState(getContext(), { ...initialState, follow: true });
  });

  it('persists reading all types from a filtered view and preserves the other user', () => {
    const page = getPage();
    expectDatabaseState(getContext(), initialState);
    page.selectMessagesFilter().markAllAsRead();
    page.allFilterButton.should('have.text', 'Todas (0)');
    page.messagesFilterButton.should('have.text', 'Mensajes (0)');
    page.marketplaceFilterButton.should('have.text', 'Marketplace (0)');
    page.markAllAsReadButton.should('not.exist');
    page.reload();
    page.allFilterButton.should('have.text', 'Todas (0)');
    page.messagesFilterButton.should('have.text', 'Mensajes (0)');
    page.marketplaceFilterButton.should('have.text', 'Marketplace (0)');
    page.markAllAsReadButton.should('not.exist');
    page.notificationCards.should('have.length', 4).each(($card) => {
      expect($card).to.have.class('bg-white');
    });
    // Zero unread messages is not an empty message list.
    page.selectMessagesFilter();
    page.notificationCards.should('have.length', 2);
    page.emptyStateMessage.should('not.exist');
    expectDatabaseState(getContext(), {
      follow: true, 'message-unread': true, 'message-read': true,
      marketplace: true, 'other-follow': false,
    });
  });
});
