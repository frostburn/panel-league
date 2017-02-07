/* eslint-env browser */

const BLOCK_COLORS = ['red', 'green', 'blue', 'violet', 'yellow', 'navy'];


class Block {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.element = document.createElement('div');
    this.element.classList.add('block');
  }

  get color() {
    return BLOCK_COLORS.find((color) => this.element.classList.contains(color));
  }

  set color(value) {
    BLOCK_COLORS.forEach((color) => {
      if (this.element.classList.contains(color) && value !== color) {
        this.element.classList.remove(color);
      }
    });
    if (value && !this.element.classList.contains(value)) {
      this.element.classList.add(value);
    }
  }

  get isFlashing() {
    return this.element.classList.contains('flashing');
  }

  set isFlashing(value) {
    if (!this.isFlashing && value) {
      this.element.classList.add('flashing');
    } else if (this.isFlashing && !value) {
      this.element.classList.remove('flashing');
    }
  }

  set swapRatio(value) {
    this.element.style.transform = `translateX(${-100 * value}%)`;
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
