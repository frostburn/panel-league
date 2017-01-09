const GameEngine = require('../../../../lib/engine');
const Swapper = require('./swapper');

const keyBindingMap = require('./keybindings');
const actionMap = require('./actions');

class UserInterface {
  constructor() {
    this.game = new GameEngine();
    this.gameLoop = null;
    this.gamepadSupport = {
      devices: {},
      previousTimestamps: {},
    };
    this.blocks = [];
    this.previewBlocks = [];
    this.swapper = new Swapper(this, 0, 0);
    this.frameRate = 30;
    this.previousChainNumber = 0;
  }

  get isGameRunning() {
    return this.game != null && this.gameLoop != null;
  }

  showBlockTooltip(blockElement, text) {
    const element = document.createElement('div');
    const rect = blockElement.getBoundingClientRect();

    element.textContent = text;
    element.classList.add('tooltip');
    element.style.position = 'absolute';
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    document.body.appendChild(element);
    window.setTimeout(() => {
      element.classList.add('animate');
    }, 100);
    window.setTimeout(() => {
      document.body.removeChild(element);
    }, 1000);
  }

  install() {
    this.installDOMElements();
    this.installEventListeners();
    this.installGameLoop();
  }

  installDOMElements() {
    const gridElement = document.createElement('div');

    gridElement.classList.add('grid');
    document.body.appendChild(gridElement);
    for (let y = 0; y < this.game.height; ++y) {
      const rowElement = document.createElement('div');

      rowElement.classList.add('row');
      gridElement.appendChild(rowElement);
      for (let x = 0; x < this.game.width; ++x) {
        const blockElement = document.createElement('div');

        blockElement.classList.add('block');
        blockElement.addEventListener('click', (ev) => {
          ev.preventDefault();
          this.action('swap', { x, y });
        });
        rowElement.appendChild(blockElement);
        this.blocks.push(blockElement);
      }
    }

    this.blocks[0].classList.add('swapper');
    this.blocks[1].classList.add('swapper');

    const previewRowElement = document.createElement('div');

    previewRowElement.classList.add('row', 'preview');
    gridElement.appendChild(previewRowElement);
    for (let x = 0; x < this.game.width; ++x) {
      const blockElement = document.createElement('div');

      blockElement.classList.add('block');
      blockElement.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.action('addRow');
      });
      previewRowElement.appendChild(blockElement);
      this.previewBlocks.push(blockElement);
    }
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

  installGameLoop() {
    this.update(this.game.step());
    this.gameLoop = window.setInterval(() => {
      if (this.isGameRunning) {
        this.update(this.game.step());
      } else {
        window.clearInterval(this.gameLoop);
        this.gameLoop = null;
      }
    }, 1000 / this.frameRate);
  }

  installGamepadListener() {
    const gamepadListener = () => {
      for (let index in this.gamepadSupport.devices) {
        const device = this.gamepadSupport.devices[index];
        const timestamp = device.timestamp;
        const previousTimestamp = this.gamepadSupport.previousTimestamps[index];

        if (previousTimestamp && previousTimestamp === timestamp) {
          continue;
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
      }
      if (Object.keys(this.gamepadSupport.devices).length > 0) {
        window.requestAnimationFrame(gamepadListener);
      }
    };

    gamepadListener();
  }

  update(state) {
    state.blocks.forEach((block, index) => {
      const element = this.blocks[index];

      element.classList.remove('red', 'green', 'blue');
      if (block.color) {
        element.classList.add(block.color);
      }
    });

    state.nextRow.forEach((block, index) => {
      const element = this.previewBlocks[index];

      element.classList.remove('red', 'green', 'blue');
      element.classList.add(block.color);
    });

    if (state.chainNumber > 0 && state.chainNumber !== this.previousChainNumber) {
      const chainingBlockIndex = state.blocks.findIndex((block) => block.chaining);

      if (chainingBlockIndex >= 0) {
        this.showBlockTooltip(this.blocks[chainingBlockIndex], `${state.chainNumber}`);
      }
    }
    this.previousChainNumber = state.chainNumber;
  }

  action(actionName, actionArguments = {}) {
    const actionCallback = actionMap[actionName];

    if (typeof actionCallback === 'function') {
      actionCallback(this, actionArguments);
    }
  }
}

module.exports = UserInterface;
