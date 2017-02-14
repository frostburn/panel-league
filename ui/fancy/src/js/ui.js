/* eslint-env browser */

const {GameEngine, NetworkGameEngine} = require('../../../../lib/engine');
const KeyAutorepeater = require('./autorepeat');
const Grid = require('./grid');

const keyBindingMap = require('./keybindings');
const actionMap = require('./actions');

const gameOptions = {
  stepper: 'panelLeagueScoring',
  width: 6,
  height: 12,
  flashTime: 80,
  floatTime: 20,
  swapTime: 4,
  garbageFlashTime: 8,
  blockTypes: ['red', 'green', 'blue', 'violet', 'yellow', 'navy'],
  addRowWhileActive: false,
  scoringSystem: 'tetrisAttack',
};

class BaseUserInterface {
  constructor() {
    this.game = null;
    this.gameLoop = null;
    this.gamepadSupport = {
      devices: {},
      previousTimestamps: {},
    };
    this.frameRate = null;
    this.waitTime = 0;
    this.grid = null;
  }

  get isGameRunning() {
    return this.game != null && this.gameLoop != null;
  }

  install() {}

  installEventListeners() {
    this.grid.installEventListeners();
    this.autorepeater = new KeyAutorepeater(200, 20);
    for (let key in keyBindingMap) {
      const action = keyBindingMap[key];
      const actionIsRepeatable = (action.slice(0, 4) === 'move');

      this.autorepeater.on(key, () => {
        this.action(action);
      }, actionIsRepeatable);
    }
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

  action(actionName, actionArguments = {}) {
    const actionCallback = actionMap[actionName];

    if (typeof actionCallback === 'function') {
      actionCallback(this, actionArguments);
    }
  }
}

class UserInterface extends BaseUserInterface {
  constructor() {
    super();
    this.game = new GameEngine(gameOptions);
    this.frameRate = 60;
    this.grid = new Grid(this, this.game.width, this.game.height);
  }

  install() {
    this.installDOMElements();
    this.installEventListeners();
    this.installGameLoop();
  }

  installDOMElements() {
    this.grid.installDOMElements(document.body);
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
}


class VsUserInterface extends BaseUserInterface{
  constructor() {
    super();
    this.player = null;
    this.grids = [];
  }

  postInstall() {
    this.installDOMElements();
    this.installEventListeners();
    this.installGameLoop();
  }

  install() {
    const socket = window.io();

    this.waitElement = document.createElement('h1');
    this.waitElement.innerHTML = 'Waiting for an opponent to join...';
    document.body.appendChild(this.waitElement);

    socket.on('connected', (data) => {
      this.player = data.player;
      this.game = NetworkGameEngine.unserialize(data.game);
      this.game.installSocket(socket);
      this.frameRate = data.frameRate;
      this.grids = [
        new Grid(this, this.game.width, this.game.height, this.player),
        new Grid(this, this.game.width, this.game.height, 1 - this.player),
      ];
      this.grid = this.grids[0];
      this.postInstall();
    });

    socket.on('clock', (data) => {
      if (!this.isGameRunning) {
        return;
      }
      const serverTime = data.time;
      while (this.game.time < serverTime) {
        this.step();
      }
      this.waitTime = this.game.time - serverTime;
    });

    socket.on('game list', (data) => {
      const game = data.games.find((game) => game.playerCount < game.maximumPlayerCount);

      if (game) {
        socket.emit('game join', { id: game.id });
      } else {
        socket.emit('game create', { mode: 'vs' });
      }
    });
    socket.emit('game list');
  }

  installDOMElements() {
    document.body.removeChild(this.waitElement);
    this.grids.forEach((grid) => {
      const columnElement = document.createElement('div');

      columnElement.classList.add('column');
      document.body.appendChild(columnElement);
      grid.installDOMElements(columnElement);
    })
  }

  installGameLoop() {
    this.gameLoop = window.setInterval(() => {
      if (this.isGameRunning) {
        if (this.waitTime-- <= 0) {
          this.step();
        }
      } else {
        window.clearInterval(this.gameLoop);
        this.gameLoop = null;
      }
    }, 1000 / this.frameRate);
  }

  step() {
    const opponent = 1 - this.player;
    const states = this.game.step().childStates;

    this.grids[0].update(states[this.player]);
    this.grids[1].update(states[opponent]);
  }
}

module.exports = {UserInterface, VsUserInterface};
