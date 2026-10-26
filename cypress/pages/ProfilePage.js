const EditProfilePage = require('./EditProfilePage');

class ProfilePage {
  #userName = () => cy.get('[data-testid="profile-name"]');
  #editProfileLink = () => cy.get('[data-testid="profile-edit-link"]');
  #bio = () => cy.get('[data-testid="profile-bio"]');
  #location = () => cy.get('[data-testid="profile-location"]');

  visit() {
    cy.visit('/profile');
    return this; 
  }

  clickEditProfile() {
    this.#editProfileLink().click();
    return new EditProfilePage();
  }

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