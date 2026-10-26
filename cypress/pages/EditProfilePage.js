class EditProfilePage {
  #bioInput = () => cy.get('[data-testid="settings-bio"]');
  #locationInput = () => cy.get('[data-testid="settings-location"]');
  #saveButton = () => cy.get('[data-testid="settings-save"]');
  #savedMessage = () => cy.get('[data-testid="settings-saved"]');

  visit() {
    cy.visit('/settings/profile');
    return this;
  }

  updateProfile(bio, location) {
    this.#bioInput().clear().type(bio);
    this.#locationInput().clear().type(location);
    this.#saveButton().click();
    return this;
  }

  getSavedMessage() {
    return this.#savedMessage();
  }
}

module.exports = EditProfilePage;