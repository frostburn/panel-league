/* eslint-env browser */

import { el, mount } from 'redom';
import Block from './block';

export default class DealPreview {
  constructor({ deals }) {
    this.el = el('.deal-preview');
    this.rows = [];

    deals.forEach((deal) => {
      const row = el('.row');
      const blocks = [];

      deal.forEach((color) => {
        const block = new Block(0, 0);

        mount(row, block);
        block.update({ color });
        blocks.push(block);
      });
      mount(this.el, row);
      this.rows.push(blocks);
    });
  }

  update({ deals }) {
    deals.forEach((deal, index) => {
      deal.forEach((color, colorIndex) => {
        this.rows[index][colorIndex].update({ color });
      });
    });
  }
}
