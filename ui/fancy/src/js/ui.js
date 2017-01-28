/* eslint-env browser */

const { GameEngine } = require('../../../../lib/engine');

const keyBindingMap = require('./keybindings');
const actionMap = require('./actions');


class UserInterface {
  constructor() {
    this.container = document.getElementById('container');

    this.socket = null;
    this.game = null;
    this.gameMode = null;
    this.gameLoop = null;
    this.waitTime = 0;

    this.gamepadSupport = {
      devices: {},
      previousTimestamps: {},
    };
  }

  get isGameRunning() {
    return this.game != null && this.gameLoop != null;
  }

  install() {
    this.installSocket();
    this.installEventListeners();
  }

  installSocket() {
    if (typeof window.io !== 'function') {
      throw new Error('Unable to initialize socket');
    }
    this.socket = window.io();
    this.socket.on('connected', (data) => {
      if (this.game != null) {
        throw new Error('Game is already running');
      }
      this.game = GameEngine.unserialize(data.game);
      // TODO: frame rates and shit
    });
    this.socket.on('clock', (data) => {
      const serverTime = data.time;

      if (this.game) {
        while (this.game.time < serverTime) {
          this.step();
        }
        this.waitTime = this.game.time - serverTime;
      }
    });
    this.socket.on('game event', (data) => {
      if (this.game) {
        // TODO: this.game.addBroadcastEvent(data.event);
      }
    });
  }

  installEventListeners() {
    window.addEventListener('keydown', (ev) => {
      const actionName = keyBindingMap[ev.key];

      if (typeof actionName === 'string') {
        ev.preventDefault();
        this.action(actionName);
      }
    });
    window.addEventListener('gamepadconnected', (ev) => {
      this.gamepadSupport.devices[ev.gamepad.index] = ev.gamepad;
      if (Object.keys(this.gamepadSupport.devices).length === 1) {
        this.installGamepadListener();
      }
    });
    window.addEventListener('gamepaddisconnected', (ev) => {
      delete this.gamepadSupport.devices[ev.gamepad.index];
    });
  }

  installGamepadListener() {
    const gamepadListener = () => {
      Object.keys(this.gamepadSupport.devices).forEach((index) => {
        const device = this.gamepadSupport.devices[index];
        const timestamp = device.timestamp;
        const previousTimestamp = this.gamepadSupport.previousTimestamps[index];

        if (previousTimestamp && previousTimestamp === timestamp) {
          return;
        }
        this.gamepadSupport.previousTimestamps[index] = timestamp;

        for (let i = 0; i < device.buttons.length; ++i) {
          if (!device.buttons[i].pressed) {
            continue;
          } else if (i === 0) {
            this.action('swap');
          } else if (i === 1) {
            this.action('addRow');
          }
        }

        for (let i = 0; i < device.axes.length && i < 2; ++i) {
          const axis = device.axes[i];

          if (axis === 1 || axis === -1) {
            if (i === 0) {
              this.action(axis > 0 ? 'moveSwapperRight' : 'moveSwapperLeft');
            } else if (i === 1) {
              this.action(axis > 0 ? 'moveSwapperDown' : 'moveSwapperUp');
            }
          }
        }
      });
      if (Object.keys(this.gamepadSupport.devices).length > 0) {
        window.requestAnimationFrame(gamepadListener);
      }
    };

    gamepadListener();
  }

  installGameLoop(frameRate) {
    if (this.gameLoop != null) {
      throw new Error('Game loop has already been installed');
    }
    this.gameLoop = window.setInterval(() => {
      if (this.isGameRunning) {
        if (this.waitTime-- <= 0) {
          this.step();
        }
      } else {
        window.clearInterval(this.gameLoop);
        this.gameLoop = null;
      }
    }, 1000 / frameRate);
  }

  step() {
    // TODO
  }

  action(actionName, actionArguments = {}) {
    const actionCallback = actionMap[actionName];

    if (typeof actionCallback === 'function') {
      actionCallback(this, actionArguments);
    }
  }
}

/*class UserInterface {
  constructor() {
    this.game = new GameEngine();
    this.frameRate = 30;
    this.grid = new Grid(this, this.game.width, this.game.height);
  }

  install() {
    this.installSocket();
    this.installDOMElements();
    this.installEventListeners();
    this.installGameLoop();
  }

  installDOMElements() {
    this.grid.installDOMElements(document.body);
  }

  installEventListeners() {
    this.grid.installEventListeners();
  }

  installGameLoop() {
    this.grid.update(this.game.step());
    this.gameLoop = window.setInterval(() => {
      if (this.isGameRunning) {
        this.grid.update(this.game.step());
      } else {
        window.clearInterval(this.gameLoop);
        this.gameLoop = null;
      }
    }, 1000 / this.frameRate);
  }
}*/

module.exports = UserInterface;
