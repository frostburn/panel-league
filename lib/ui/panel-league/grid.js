import { el, mount, unmount } from 'redom';

import Block from './block';
import GarbageSlab from './garbage';
import Swapper from './swapper';

import { dispatch } from '../dispatch';
import { getBlockSize } from './utils';


export default class Grid {
  constructor({ width, height, player }) {
    this.width = width;
    this.height = height;
    this.player = player;

    this.blocks = [];
    this.previewBlocks = [];

    this.garbageSlabs = new Map();

    this.el = el('.column',
      el('.score',
        this.scoreDisplay = el('span', 'Score 0')
      ),
      this.grid = el('.grid',
        this.swapper = new Swapper({ grid: this, x: 0, y: 0 }),
        {
          style: {
            width: getBlockSize(this.width),
          },
        }
      )
    );

    this.state = {
      score: 0,
    };

    // Construct block rows and mount them.
    for (let y = 0; y < this.height; ++y) {
      const row = el('.row');

      mount(this.grid, row);
      this[y] = {};
      for (let x = 0; x < this.width; ++x) {
        const block = new Block({ x, y });

        mount(row, block);
        this.blocks.push(block);
        this[y][x] = block;
      }
    }

    // Construct preview row and mount it.
    this.previewRow = el('.row.preview');
    mount(this.grid, this.previewRow);
    for (let x = 0; x < this.width; ++x) {
      const block = new Block({ x, y: this.height });

      mount(this.previewRow, block);
      this.previewBlocks.push(block);
    }
  }

  installEventListeners() {
    this.blocks.forEach(block => {
      block.el.addEventListener('click', ev => {
        ev.preventDefault();
        dispatch(this, 'Swap', { x: block.x, y: block.y });
      });
    });
    this.previewRow.addEventListener('click', ev => {
      ev.preventDefault();
      dispatch(this, 'AddRow');
    });
  }

  update(state) {
    const { blocks, nextRow, score } = state;

    blocks.forEach((block, index) => {
      const { slab } = block;

      this.blocks[index].update({
        color: block.color,
        isFlashing: block.flashTimer >= 0,
        swapRatio: block.swapTimer / state.swapTime,
        isGarbagePreview: (
          slab &&
          slab.flashTimer >= 0 &&
          index >= state.width * (state.height - slab.y - 1)
        ),
      });
    });

    nextRow.forEach((block, index) => {
      this.previewBlocks[index].color = block.color;
    });

    if (this.state.score !== score) {
      this.scoreDisplay.innerText = `Score ${score}`;
      this.state.score = score;
    }

    this.updateGarbage(state);
  }

  getOrCreateGarbageSlab(slab) {
    let garbage = this.garbageSlabs.get(slab.uuid);

    if (!garbage) {
      garbage = new GarbageSlab(slab);
      mount(this.grid, garbage);
      this.garbageSlabs.set(slab.uuid, garbage);
    }

    return garbage;
  }

  updateGarbage(state) {
    const unusedIds = new Set(this.garbageSlabs.keys());

    state.garbage.forEach(slab => {
      const garbageSlab = this.getOrCreateGarbageSlab(slab);

      garbageSlab.update(state, slab);
      unusedIds.delete(slab.uuid);
    });
    unusedIds.forEach(uuid => {
      unmount(this.grid, this.garbageSlabs.get(uuid));
      this.garbageSlabs.delete(uuid);
    });
  }
}
