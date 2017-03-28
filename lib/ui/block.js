/* eslint-env browser */

const { blockSize } = require('./variables');

const BLOCK_COLORS = ['red', 'green', 'blue', 'violet', 'yellow', 'navy'];


class Block {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.element = document.createElement('div');
    this.element.classList.add('block');
    // Cached variables to circumvent DOM access.
    this._color = null;
    this._isFlashing = false;
    this._isGarbagePreview = false;
    this._swapRatio = 0;
  }

  get color() {
    return BLOCK_COLORS.find((color) => this.element.classList.contains(color));
  }

  set color(value) {
    if (value !== this._color) {
      if (this._color) {
        this.element.classList.remove(this._color);
      }
      if (value) {
        this.element.classList.add(value);
      }
      this._color = value;
    }
  }

  get isFlashing() {
    return this.element.classList.contains('flashing');
  }

  set isFlashing(value) {
    if (this._isFlashing && value) {
      this.element.classList.add('flashing');
    }
    else if (this._isFlashing && !value) {
      this.element.classList.remove('flashing');
    }
    this._isFlashing = value;
  }

  get isGarbagePreview() {
    return this.element.classList.contains('garbage-preview');
  }

  set isGarbagePreview(value) {
    if (!this._isGarbagePreview && value) {
      this.element.classList.add('garbage-preview');
    }
    else if (this._isGarbagePreview && !value) {
      this.element.classList.remove('garbage-preview');
    }
    this._isGarbagePreview = value;
  }

  set swapRatio(value) {
    if (value !== this._swapRatio) {
      this.element.style.right = `${value * blockSize.value}${blockSize.unit}`;
      this._swapRatio = value;
    }
  }

  showTooltip(text) {
    const tooltip = document.createElement('div');
    const { left, top } = this.element.getBoundingClientRect();

    tooltip.textContent = text;
    tooltip.classList.add('tooltip');
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    document.body.appendChild(tooltip);
    window.setTimeout(() => {
      tooltip.classList.add('animate');
    }, 100);
    window.setTimeout(() => {
      document.body.removeChild(tooltip);
    }, 1000);
  }
}

module.exports = Block;
