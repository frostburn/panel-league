// Block colors to be used with the game engine.
const R = 'red';
const G = 'green';
const B = 'blue';
const _ = null;

module.exports.blockTypes = [R, G, B];
module.exports.R = R;
module.exports.G = G;
module.exports.B = B;
module.exports._ = _;

// A helpful debug printer.
module.exports.printColors = ((game) => {
  let row = '';
  game.colors.forEach((color, index) => {
    let block = '_';
    switch (color) {
      case R:
        block = 'R';
        break;
      case G:
        block = 'G';
        break;
      case B:
        block = 'B';
        break;
    }
    row += block + ' ';
    if (index % game.width === game.width - 1) {
      console.log(row);
      row = '';
    }
  });
});

module.exports.newBlock = (() => {
  return {
    color: null,
    flashTimer: -1,
    floatTimer: -1,
    swapTimer: 0,
    chaining: false,
    garbage: false,
  };
});

module.exports.clearBlock = ((block) => {
  block.color = null;
  block.flashTimer = -1;
  block.floatTimer = -1;
  block.swapTimer = 0;
  block.chaining = false;
  block.garbage = false;
});

// Iterate over the blocks and their neighbours while the callback returns true
module.exports.floodFill = ((state, callback) => {
  const blocks = state.blocks;
  let floodFillActive = true;
  while (floodFillActive) {
    floodFillActive = false;
    blocks.forEach((block, i) => {
      const bellow = blocks[i + state.width];
      const above = blocks[i - state.width];
      let left;
      let right;

      if (i % state.width > 0) {
        left = blocks[i - 1];
      }
      if (i % state.width < state.width - 1) {
        right = blocks[i + 1];
      }

      [left, right, above, bellow].forEach((neighbour) => {
        if (!neighbour) {
          return;
        }
        if (callback(block, neighbour)) {
          floodFillActive = true;
        }
      });
    });
  }
});
