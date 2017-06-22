/* eslint-env browser */

import { mount } from 'redom';

import App from './app';

require('../../asset/css/style.less');


const initialize = () => mount(document.body, new App());

if (document.readyState !== 'loading') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
