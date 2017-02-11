/* eslint-env browser */

const SVG = require('svg.js');

const { blockSize } = require('./variables');


class GarbageSlab {
  constructor(parentElement, slab) {
    this.parentElement = parentElement;
    this.element = document.createElement('div');
    this.element.classList.add('garbage');
    this.parentElement.appendChild(this.element);
    this.decorate(slab);
  }

  decorate(slab) {
    const rand = Math.random;

    this.element.style.width = `${slab.width * blockSize.value}${blockSize.unit}`;
    this.element.style.left = `${slab.x * blockSize.value}${blockSize.unit}`;
    this.element.setAttribute('id', slab.uuid);

    const draw = SVG(slab.uuid);

    for (let i = 0; i < slab.width * slab.height * 4; ++i) {
      const color = new SVG.Color({
        r: 60 + Math.floor(20 * rand()),
        g: 50 + Math.floor(15 * rand()),
        b: 40 + Math.floor(10 * rand()),
      });
      const circle = draw.circle(`${rand()}em`);

      circle.attr({ fill: color.toHex() });
      circle.cx(`${rand() * slab.width * blockSize.value}${blockSize.unit}`)
      circle.cy(`${rand() * slab.height * blockSize.value}${blockSize.unit}`);
    }
  }

  update(state, slab) {
    let y = slab.y;
    let height = slab.height;

    if (slab.flashTimer >= 0) {
      ++y;
      --height;
    }
    const top = state.height - y - height;

    this.element.style.height = `${height * blockSize.value}${blockSize.unit}`;
    this.element.style.top = `${top * blockSize.value}${blockSize.unit}`;
    this.isFlashing = (slab.flashTimer >= 0);
  }

  remove() {
    this.parentElement.removeChild(this.element);
  }

  get isFlashing() {
    return this.element.classList.contains('flashing');
  }

  set isFlashing(value) {
    if (!this.isFlashing && value) {
      this.element.classList.add('flashing');
    }
    else if (this.isFlashing && !value) {
      this.element.classList.remove('flashing');
    }
  }
}

module.exports = GarbageSlab;
