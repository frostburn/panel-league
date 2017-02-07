/* eslint-env browser */

require('../css/style.less');

const {UserInterface, VsUserInterface} = require('./ui');

const initialize = () => {
  if (window.io) {
    (new VsUserInterface()).install();
  } else {
    (new UserInterface()).install();
  }
};

if (document.readyState !== 'loading') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
