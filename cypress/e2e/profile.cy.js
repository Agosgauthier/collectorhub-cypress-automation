const LoginPage = require('../pages/LoginPage');
const ProfilePage = require('../pages/ProfilePage');
const EditProfilePage = require('../pages/EditProfilePage');

describe('Profile', () => {
  beforeEach(() => {
    new LoginPage().visit().login('demo@collectorhub.com', 'password');

    cy.url().should('include', '/feed');
  });

  it('shows the name of the logged user', () => {
    const profilePage = new ProfilePage().visit();

    profilePage.getUserName().should('contain.text', 'Usuario Demo');
  });

  it('goes to the edit page when clicking "Edit profile"', () => {
    const profilePage = new ProfilePage().visit();

    profilePage.clickEditProfile();

    cy.url().should('include', '/settings/profile');
  });

  it('shows a saved message after updating bio and location', () => {
    const editProfilePage = new EditProfilePage().visit();

    editProfilePage.updateProfile('I collect old coins', 'Buenos Aires, Argentina');

    editProfilePage.getSavedMessage().should('be.visible');
  });

  it('shows the updated bio and location on the profile page', () => {
    new EditProfilePage()
      .visit()
      .updateProfile('I collect vinyl records', 'Bolivar, Argentina');

    const profilePage = new ProfilePage().visit();

    profilePage.getBio().should('contain.text', 'I collect vinyl records');
    profilePage.getLocation().should('contain.text', 'Bolivar, Argentina');
  });
});