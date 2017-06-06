/* eslint-env browser */

import { mount } from 'redom';

import PanelLeagueGameDuel from './panel-league/game-duel';

require('../../asset/css/style.less');


const initialize = () => mount(document.body, new PanelLeagueGameDuel(window.io()));

if (document.readyState !== 'loading') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
