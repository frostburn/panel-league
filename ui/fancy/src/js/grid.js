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
    this.previousChainNumber = 0;
    this.swapper = new Swapper(this, 0, 0);
  }

  installDOMElements(parentElement) {
    const gridElement = document.createElement('div');

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
    });
    state.nextRow.forEach((block, index) => {
      this.previewBlocks[index].color = block.color;
    });

    if (state.chainNumber > 0 && state.chainNumber !== this.previousChainNumber) {
      const chainingBlockIndex = state.blocks.findIndex((block) => block.chaining);

      if (chainingBlockIndex >= 0) {
        this.blocks[chainingBlockIndex].showTooltip(`${state.chainNumber}`);
      }
    }
    this.previousChainNumber = state.chainNumber;
  }
}

module.exports = Grid;
