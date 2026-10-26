const EditProfilePage = require('./EditProfilePage');

class ProfilePage {
  // ---------- Selectors (private) ----------
  #userName = () => cy.get('[data-testid="profile-name"]');
  #editProfileLink = () => cy.get('[data-testid="profile-edit-link"]');
  #bio = () => cy.get('[data-testid="profile-bio"]');
  #location = () => cy.get('[data-testid="profile-location"]');

  // ---------- User actions ----------
  visit() {
    cy.visit('/profile');
    return this; // we stay on the profile page
  }

  clickEditProfile() {
    this.#editProfileLink().click();
    return new EditProfilePage(); // the link takes us to the edit page
  }

  // ---------- Things the test can look at ----------
  getUserName() {
    return this.#userName();
  }

  getBio() {
    return this.#bio();
  }

  getLocation() {
    return this.#location();
  }
}

module.exports = ProfilePage;