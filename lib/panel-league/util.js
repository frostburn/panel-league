/* eslint-env node */

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

function getColors(game) {
  const state = game.step();
  const colors = Array.from(state.blocks, (block) => block.color);

  --game.time;

  return colors;
}


module.exports.getColors = getColors;


// A helpful debug printer.
module.exports.printColors = ((game) => {
  let row = '';

  getColors(game).forEach((color, index) => {
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
      default:
        break;
    }
    row += `${block} `;
    if (index % game.width === game.width - 1) {
      process.stdout.write(`${row}\n`);
      row = '';
    }
  });
});


module.exports.newBlock = function newBlock() {
  return {
    color: null,
    flashTimer: -1,
    floatTimer: -1,
    swapTimer: 0,
    chaining: false,
    garbage: false,
  };
};


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

module.exports.shuffleInPlace = ((array, random) => {
  for (let i = array.length - 1; i > 0; --i) {
    const j = Math.floor(random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
});
