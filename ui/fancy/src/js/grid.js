/* eslint-env browser */

const Block = require('./block');
const GarbageSlab = require('./garbage');
const Swapper = require('./swapper');
const { blockSize } = require('./variables');


class Grid {
  constructor(userInterface, width, height, player) {
    this.userInterface = userInterface;
    this.width = width;
    this.height = height;
    this.player = player;
    this.blocks = [];
    this.previewBlocks = [];
    this.previewRowElement = document.createElement('div');
    this.previewRowElement.classList.add('row', 'preview');
    this.swapper = new Swapper(this, 0, 0);
    this.garbageSlabs = new Map();

    userInterface.game.on('chainMatchMade', (effect) => {
      if (effect.player !== undefined && effect.player != this.player) {
        return;
      }
      // Match indices are sorted and we take the one closest to the top.
      const chainingBlockIndex = effect.indices[0];
      this.blocks[chainingBlockIndex].showTooltip(`${effect.chainNumber}`);
    });

    userInterface.game.on('addRow', (effect) => {
      if (effect.player !== undefined && effect.player != this.player) {
        return;
      }
      --this.swapper.y
    }, false);
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
    gridElement.style.width = `${this.width * blockSize.value}${blockSize.unit}`;
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

    this.gridElement = gridElement;

    this.swapper.installDOMElements(gridElement);
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
      const slab = block.slab;

      this.blocks[index].color = block.color;
      this.blocks[index].isFlashing = (block.flashTimer >= 0);
      this.blocks[index].swapRatio = block.swapTimer / state.swapTime;
      this.blocks[index].isGarbagePreview = (
        slab &&
        slab.flashTimer >= 0 &&
        index >= state.width * (state.height - slab.y - 1)
      );
    });
    state.nextRow.forEach((block, index) => {
      this.previewBlocks[index].color = block.color;
    });
    this.scoreDisplayElement.innerHTML = `Score ${state.score}`;
    this.updateGarbage(state);
  }

  getOrCreateGarbageSlab(slab) {
    if (!this.garbageSlabs.has(slab.uuid)) {
      this.garbageSlabs.set(
        slab.uuid,
        new GarbageSlab(this.gridElement, slab)
      );
    }
    return this.garbageSlabs.get(slab.uuid);
  }

  // Variadic garbage slabs.
  updateGarbage(state) {
    const unusedIds = new Set(this.garbageSlabs.keys());

    state.garbage.forEach((slab) => {
      const garbageSlab = this.getOrCreateGarbageSlab(slab);

      garbageSlab.update(state, slab);
      unusedIds.delete(slab.uuid);
    });
    for (let uuid of unusedIds.values()) {
      this.garbageSlabs.get(uuid).remove();
      this.garbageSlabs.delete(uuid);
    };
  }
}

module.exports = Grid;
