/* eslint-env browser */

const Block = require('./block');
const Swapper = require('./swapper');


class Grid {
  constructor(userInterface, width, height) {
    this.userInterface = userInterface;
    this.width = width;
    this.height = height;
    this.blocks = [];
    this.previewBlocks = [];
    this.previewRowElement = document.createElement('div');
    this.previewRowElement.classList.add('row', 'preview');
    this.swapper = new Swapper(this, 0, 0);

    userInterface.game.on('chainMatchMade', (effect) => {
      // Match indices are sorted and we take the one closest to the top.
      const chainingBlockIndex = effect.indices[0];
      this.blocks[chainingBlockIndex].showTooltip(`${effect.chainNumber}`);
    });

    userInterface.game.on('addRow', () => --this.swapper.y, false);
  }

  installDOMElements(parentElement) {
    const scoreElement = document.createElement('div');
    const scoreDisplayElement = document.createElement('span');
    const gridElement = document.createElement('div');

    this.scoreDisplayElement = scoreDisplayElement;
    scoreDisplayElement.innerHTML = "Score 0";
    scoreElement.classList.add('score');
    scoreElement.appendChild(scoreDisplayElement);
    parentElement.appendChild(scoreElement);

    gridElement.classList.add('grid');
    parentElement.appendChild(gridElement);
    for (let y = 0; y < this.height; ++y) {
      const rowElement = document.createElement('div');

      rowElement.classList.add('row');
      gridElement.appendChild(rowElement);
      this[y] = {};
      for (let x = 0; x < this.width; ++x) {
        const block = new Block(x, y);

        rowElement.appendChild(block.element);
        this.blocks.push(block);
        this[y][x] = block;
      }
    }
    gridElement.appendChild(this.previewRowElement);
    for (let x = 0; x < this.width; ++x) {
      const block = new Block(x, this.height);

      this.previewRowElement.appendChild(block.element);
      this.previewBlocks[x] = block;
    }
    this.swapper.blocks.forEach((block) => {
      block.isSwapper = true;
    });
  }

  installEventListeners() {
    this.blocks.forEach((block) => {
      block.element.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.userInterface.action('swap', { x: block.x, y: block.y });
      });
    });
    this.previewRowElement.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.userInterface.action('addRow');
    });
  }

  update(state) {
    state.blocks.forEach((block, index) => {
      this.blocks[index].color = block.color;
      this.blocks[index].isFlashing = (block.flashTimer >= 0);
      this.blocks[index].swapRatio = block.swapTimer / state.swapTime;
    });
    state.nextRow.forEach((block, index) => {
      this.previewBlocks[index].color = block.color;
    });
    this.scoreDisplayElement.innerHTML = `Score ${state.score}`;
  }
}

module.exports = Grid;
