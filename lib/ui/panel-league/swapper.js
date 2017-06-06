import { el } from 'redom';

import { getBlockSize } from './utils';


export default class Swapper {
  constructor({ grid, x, y }) {
    this.grid = grid;

    this.el = el('.row',
      el('.block.swapper'),
      el('.block.swapper'),
      {
        style: {
          position: 'absolute',
          zIndex: 200,
          left: getBlockSize(x),
          top: getBlockSize(y),
        },
      }
    );

    this.state = { x, y };
  }

  get x() {
    return this.state.x;
  }

  set x(x) {
    if (x >= 0 && x < this.grid.width - 1) {
      this.update({ x });
    }
  }

  get y() {
    return this.state.y;
  }

  set y(y) {
    if (y >= 0 && y < this.grid.height) {
      this.update({ y });
    }
  }

  update({ x = this.state.x, y = this.state.y }) {
    if (x === this.state.x && y === this.state.y) {
      return;
    }
    this.state = { x, y };
    this.el.style.left = getBlockSize(x);
    this.el.style.top = getBlockSize(y);
  }
}
