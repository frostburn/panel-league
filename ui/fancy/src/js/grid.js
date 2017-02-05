/* eslint-env browser */

const Block = require('./block');
const Swapper = require('./swapper');
const SVG = require('svg.js');


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
    this.garbageElements = new Map();

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
      this.blocks[index].color = block.color;
      this.blocks[index].isFlashing = (block.flashTimer >= 0);
      this.blocks[index].swapRatio = block.swapTimer / state.swapTime;
    });
    state.nextRow.forEach((block, index) => {
      this.previewBlocks[index].color = block.color;
    });
    this.scoreDisplayElement.innerHTML = `Score ${state.score}`;
    this.updateGarbage(state);
  }

  decorateGarbage(element, slab) {
    const rand = Math.random;

    element.setAttribute("id", slab.uuid);
    const draw = SVG(slab.uuid);
    for (let i = 0; i < slab.width * slab.height * 4; ++i) {
      const color = new SVG.Color({
        r: 60 + Math.floor(20 * rand()),
        g: 50 + Math.floor(15 * rand()),
        b: 40 + Math.floor(10 * rand()),
      });
      const circle = draw.circle(`${rand()}em`);
      circle.attr({ fill: color.toHex() });
      circle.cx(`${rand() * slab.width * 2.5}em`)
      circle.cy(`${rand() * slab.height * 2.5}em`);
    }
  }

  getOrCreateGarbageElement(slab) {
    if (this.garbageElements.has(slab.uuid)) {
      return this.garbageElements.get(slab.uuid);
    }
    const newElement = document.createElement('div');
    newElement.classList.add('garbage');
    this.gridElement.appendChild(newElement);
    this.garbageElements.set(slab.uuid, newElement);
    this.decorateGarbage(newElement, slab);
    return newElement;
  }

  // Variadic garbage slabs.
  updateGarbage(state) {
    const unusedIds = new Set(this.garbageElements.keys());

    state.garbage.forEach((slab) => {
      const slabElement = this.getOrCreateGarbageElement(slab);
      const top = state.height - slab.y - slab.height;

      unusedIds.delete(slab.uuid);
      slabElement.style.width = `${slab.width * 2.5}em`;
      slabElement.style.height = `${slab.height * 2.5}em`;
      slabElement.style.left = `${slab.x * 2.5}em`;
      slabElement.style.top = `${top * 2.5}em`;
    });
    for (let uuid of unusedIds.values()) {
      this.gridElement.removeChild(this.garbageElements.get(uuid));
      this.garbageElements.delete(uuid);
    };
  }
}

module.exports = Grid;
