/* eslint-env react browser */

import React from 'react';
import ReactDOM from 'react-dom';

import UserInterface from './ui.jsx';
import '../../asset/css/style.less';


// TODO: Implement hot module loading for the server.
if (module.hot) {
  module.hot.accept();
}

ReactDOM.render(<UserInterface/>, document.getElementById('container'));
