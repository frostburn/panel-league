import { el, mount, svg } from 'redom';

import { getBlockSize } from './utils';


/**
 * Draws random SVG circles on given element.
 */
function decorate(el, { x, width, height }) {
  const svgElement = svg('svg');

  el.style.width = getBlockSize(width);
  el.style.left = getBlockSize(x);
  mount(el, svgElement);

  for (let i = 0; i < width * height * 4; ++i) {
    const r = 60 + Math.floor(20 * Math.random());
    const g = 50 + Math.floor(15 * Math.random());
    const b = 40 + Math.floor(10 * Math.random());
    const circle = svg('circle', {
      fill: `rgb(${r}, ${g}, ${b})`,
      r: `${Math.random() / 2}em`,
      cx: getBlockSize(Math.random() * width),
      cy: getBlockSize(Math.random() * height),
    });

    mount(svgElement, circle);
  }
}


export default class GarbageSlab {
  constructor(slab) {
    this.el = el('.garbage');
    decorate(this.el, slab);
  }

  get isFlashing() {
    return this.el.classList.contains('flashing');
  }

  set isFlashing(value) {
    if (!this.isFlashing && value) {
      this.el.classList.add('flashing');
    } else if (this.isFlashing && !value) {
      this.el.classList.remove('flashing');
    }
  }

  update(state, slab) {
    let { y, height } = slab;
    let top;

    if (slab.flashTimer >= 0) {
      ++y;
      --height;
    }
    top = state.height - y - height;
    this.el.style.height = getBlockSize(height);
    this.el.style.top = getBlockSize(top);
    this.isFlashing = slab.flashTimer >= 0;
  }
}
