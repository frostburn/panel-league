import isFunction from 'lodash/isFunction';

import { el } from 'redom';

import KeyAutorepeater from './autorepeat';

import { listen } from './dispatch';


/**
 * Abstract base class for all games that can be played with Panel League.
 */
export default class Game {
  constructor() {
    this.el = el('.game');

    this.autorepeater = new KeyAutorepeater(200, 20);
  }

  get isRunning() {
    return false;
  }

  onmount() {
    listen(this);
    // TODO: Modify auto repeater so that it's uninstallable.
    this.installKeyBindings();
  }

  /**
   * Installs all key bindings used in the game. Key bindings are read from
   * prototype property `keyBindings`.
   */
  installKeyBindings() {
    if (!this.keyBindings) {
      return;
    }
    Object.keys(this.keyBindings).forEach(key => {
      const action = this.keyBindings[key];
      const actionIsRepeatable = action.startsWith('move');

      this.autorepeater.on(key, () => {
        const handler = this[`on${action}`];

        if (isFunction(handler)) {
          handler.call(this);
        }
      });
    });
  }
}
