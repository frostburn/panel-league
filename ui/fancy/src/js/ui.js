const GameEngine = require('../../../../lib/engine');
const Swapper = require('./swapper');

const keyBindingMap = require('./keybindings');
const actionMap = require('./actions');

class UserInterface {
  constructor() {
    this.game = new GameEngine();
    this.gameLoop = null;
    this.blocks = [];
    this.previewBlocks = [];
    this.swapper = new Swapper(this, 0, 0);
    this.frameRate = 30;
  }

  get isGameRunning() {
    return this.game != null && this.gameLoop != null;
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
  }

  action(actionName, actionArguments = {}) {
    const actionCallback = actionMap[actionName];

    if (typeof actionCallback === 'function') {
      actionCallback(this, actionArguments);
    }
  }
}

module.exports = UserInterface;
