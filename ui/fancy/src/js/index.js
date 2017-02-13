/* eslint-env browser */

require('../css/style.less');

const {UserInterface, SandboxUserInterface, VsUserInterface} = require('./ui');

const initialize = () => {
  if (window.io) {
    // TODO: Figure out how the server can tell us the game mode.
    // (new VsUserInterface()).install();
    (new SandboxUserInterface()).install();
  } else {
    (new UserInterface()).install();
  }
};

if (document.readyState !== 'loading') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
