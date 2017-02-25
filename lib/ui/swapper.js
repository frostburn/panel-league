/* eslint-env browser */

const { blockSize } = require('./variables');

class Swapper {
  constructor(grid, x, y) {
    this.grid = grid;
    this.coordinates = { x, y };
  }

  installDOMElements(parentElement) {
    const eyes = [
      document.createElement('div'),
      document.createElement('div'),
    ];

    this.element = document.createElement('div');
    this.element.classList.add('row');
    eyes.forEach((eye) => {
      eye.classList.add('block');
      eye.classList.add('swapper');
      this.element.appendChild(eye);
    });
    this.element.style.position = 'absolute';
    this.element.style.zIndex = 200;
    parentElement.appendChild(this.element);
    this.update(this.coordinates);
  }

  get x() {
    return this.coordinates.x;
  }

  set x(x) {
    if (x >= 0 && x < this.grid.width - 1) {
      this.update({ x });
    }
  }

  get y() {
    return this.coordinates.y;
  }

  set y(y) {
    if (y >= 0 && y < this.grid.height) {
      this.update({ y });
    }
  }

  update(coordinates) {
    const { x = this.coordinates.x, y = this.coordinates.y } = coordinates;

    this.coordinates = { x, y };
    this.element.style.left = `${x * blockSize.value}${blockSize.unit}`;
    this.element.style.top = `${y * blockSize.value}${blockSize.unit}`;
  }
}

module.exports = Swapper;
