import isFunction from 'lodash/isFunction';

import { el } from 'redom';

import KeyAutorepeater from './autorepeat';

import { listen } from './dispatch';


/**
 * Abstract base class for all games that can be played with Panel League.
 */
export default class Game {
  constructor({ keyBindings }) {
    if (keyBindings != null) {
      this.keyBindings = keyBindings;
    }
    this.el = el('.game');

    this.autorepeater = new KeyAutorepeater(200, 20);
    this.timers = [];
  }

  get isRunning() {
    return false;
  }

  onmount() {
    listen(this);
    this.installKeyBindings();
  }

  onunmount() {
    this.autorepeater.uninstall();
    this.timers.forEach(timer => window.clearInterval(timer));
  }

  /**
   * Installs all key bindings used in the game. Key bindings are read from
   * prototype property `keyBindings`.
   */
  installKeyBindings() {
    if (!this.keyBindings) {
      return;
    }
    Object.keys(this.keyBindings).forEach((key) => {
      const action = this.keyBindings[key];
      const actionIsRepeatable = action.toLowerCase().startsWith('move');

      this.autorepeater.on(key, () => {
        const handler = this[`on${action}`];

        if (isFunction(handler)) {
          handler.call(this);
        }
      }, actionIsRepeatable);
    });
  }

  installTimer(callback, frameRate) {
    this.timers.push(window.setInterval(callback, 1000 / frameRate));
  }
}
