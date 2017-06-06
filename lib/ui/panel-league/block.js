/* eslint-env browser */

import { el, mount, unmount } from 'redom';

import { getBlockSize } from './utils';


const BLOCK_COLORS = [
  'red',
  'green',
  'blue',
  'violet',
  'yellow',
  'navy',
];


export default class Block {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;

    this.el = el('.block');

    // Cached variables to circumvent DOM access.
    this.state = {
      color: null,
      isFlashing: false,
      isGarbagePreview: false,
      swapRatio: 0,
    };
  }

  get color() {
    return BLOCK_COLORS.find(color => this.el.classList.contains(color));
  }

  set color(value) {
    if (value === this.state.color) {
      return;
    }
    if (this.state.color) {
      this.el.classList.remove(this.state.color);
    }
    if (value) {
      this.el.classList.add(value);
    }
    this.state.color = value;
  }

  get isFlashing() {
    return this.el.classList.contains('flashing');
  }

  set isFlashing(value) {
    if (!this.state.isFlashing && value) {
      this.el.classList.add('flashing');
    } else if (this.state.isFlashing && !value) {
      this.el.classList.remove('flashing');
    }
    this.state.isFlashing = value;
  }

  get isGarbagePreview() {
    return this.el.classList.contains('garbage-preview');
  }

  set isGarbagePreview(value) {
    if (!this.state.isGarbagePreview && value) {
      this.el.classList.add('garbage-preview');
    } else if (this.state.isGarbagePreview && !value) {
      this.el.classList.remove('garbage-preview');
    }
    this.state.isGarbagePreview = value;
  }

  set swapRatio(value) {
    if (value === this.state.swapRatio) {
      return;
    }
    this.el.style.right = getBlockSize(value);
    this.state.swapRatio = value;
  }

  update({ color, isFlashing, swapRatio, isGarbagePreview }) {
    this.color = color;
    this.isFlashing = isFlashing;
    this.swapRatio = swapRatio;
    this.isGarbagePreview = isGarbagePreview;
  }

  addTooltip(text) {
    const { left, top } = this.el.getBoundingClientRect();
    const tooltip = el('.panel-league-tooltip',
      text,
      {
        style: {
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
        },
      }
    );

    mount(document.body, tooltip);
    window.setTimeout(() => tooltip.classList.add('animate'), 100);
    window.setTimeout(() => unmount(document.body, tooltip), 1000);
  }
}
