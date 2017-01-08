require('../css/style.less');

const UserInterface = require('./ui');

const initialize = () => {
  (new UserInterface()).install();
}

if (document.readyState !== 'loading') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
