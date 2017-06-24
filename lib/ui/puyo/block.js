/* eslint-env browser */

import { el } from 'redom';

const BLOCK_COLORS = {
  '-1': 'nuisance',
  0: 'empty',
  1: 'red',
  2: 'green',
  3: 'blue',
  4: 'yellow',
  5: 'violet',
  6: 'navy',
};

export default class Block {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;

    this.el = el('.block .empty');

    // Cached variables to circumvent DOM access.
    this.state = {
      color: 0,
      classes: [],
    };
  }

  get color() {
    return this.state.color;
  }

  set color(color) {
    this.update({ color });
  }

  update({ color = this.state.color, classes = this.state.classes }) {
    if (color !== this.state.color) {
      this.el.classList.remove(BLOCK_COLORS[this.state.color]);
      this.el.classList.add(BLOCK_COLORS[color]);
      this.state.color = color;
    }
    classes.forEach((cls) => {
      this.el.classList.add(cls);
    });
    this.state.classes.forEach((cls) => {
      if (classes.indexOf(cls) < 0) {
        this.el.classList.remove(cls);
      }
    });
    this.state.classes = classes;
  }
}
