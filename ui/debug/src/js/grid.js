/* eslint-env browser */

const $newBlock = (() => {
  return $('<div>', {
    css: {
      width: '40px',
      height: '40px',
      float: 'left',
      'font-size': '35px',
    },
  });
});

class Grid {
  constructor(game, $container) {
    this.game = game;
    this.width = game.width;
    this.height = game.height;
    this.$blocks = [];
    this.$previewBlocks = [];
    this.$chainNumber = $('<p>');
    this.$time = $('<p>');
    this.$score = $('<p>');

    for (let y = 0; y < this.height; ++y) {
      const $row = $('<div>', {css: {display: 'table'}});
      $container.append($row);
      for (let x = 0; x < this.width; ++x) {
        const $block = $newBlock();
        $row.append($block);
        this.$blocks.push($block);
      }
    }
    const $previewRow = $('<div>', {
      css: {
        display: 'table',
        opacity: 0.5,
        'margin-bottom': '10px',
      }
    });
    $container.append($previewRow);
    for (let x = 0; x < this.width; ++x) {
      const $block = $newBlock();
      $previewRow.append($block);
      this.$previewBlocks.push($block);
    }

    this.$blocks.forEach(($block, index) => {
      $block.click((ev) => {
        ev.preventDefault();
        this.game.addEvent(this.game.time, 'swap', index);
      });
    });
    this.$previewBlocks.forEach(($block) => {
      $block.click((ev) => {
        ev.preventDefault();
        this.game.addEvent(this.game.time, 'addRow');
      });
    });
    $container.append(this.$chainNumber, this.$time, this.$score);
  }

  update(state) {
    state.blocks.forEach((block, index) => this.updateBlock(state, block, index));
    state.nextRow.forEach((block, index) => {
      this.$previewBlocks[index].css('background', block.color || 'transparent');
    });
    this.$chainNumber.text(`Chain number: ${state.chainNumber}`);
    this.$time.text(`Time step: ${state.time}` );
    this.$score.text(`Score: ${state.score}`);
  }

  updateBlock(state, block, index) {
    const $block = this.$blocks[index];

    $block.css('background', block.color || 'transparent');
    if (block.flashTimer >= 0) {
      $block.css('opacity', (block.flashTimer + 1) / (state.flashTime + 2));
    } else {
      $block.css('opacity', 1);
    }

    if (block.swapTimer !== 0) {
      // Add a little extra nudge to make initial swapping visible too.
      // Make the nudge unsymmetric to avoid the blocks overlapping during the swap.
      const nudge = (block.swapTimer < 0) ? 0.1 : 0.4;
      let swapRatio = block.swapTimer / (state.swapTime + nudge);
      swapRatio *= 40;
      $block.css('margin-right', swapRatio + "px");
      $block.css('margin-left', -swapRatio + "px");
    } else {
      $block.css('margin-right', 0);
      $block.css('margin-left', 0);
    }

    if (block.floatTimer > 0) {
      $block.text('F');
    } else if (block.floatTimer === 0) {
      $block.text('f');
    } else {
      $block.text('');
    }

    if (block.chaining) {
      $block.text(`${$block.text()}C`);
    }

    if (block.garbage) {
      const slab = block.slab
      $block.text('G');
      if (slab.flashTimer >= 0) {
        $block.text(`${$block.text()}f`);
      }
      const t = (slab.flashTimer < 0) ? slab.flashTime : slab.flashTimer;
      $block.css('opacity', (slab.flashTime - t) / slab.flashTime * 0.5 + 0.5);
    }
  }
}

module.exports = Grid;
