// Block colors to be used with a game engine using a panel-league stepper.
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
  const colors = Array.from(game.currentState.blocks, block => block.color);

  return colors;
}

// A helpful debug printer.
function printColors(game) {
  getColors(game).forEach((color, index) => {
    let block;
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
      case _:
        block = '_';
        break;
      default:
        block = '?';
        break;
    }
    process.stdout.write(`${block} `);
    if (index % game.width === game.width - 1) {
      process.stdout.write('\n');
    }
  });
}

// TODO: Fix rest of the style issues.
module.exports.getColors = getColors;
module.exports.printColors = printColors;

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

function seedFill(source, target, x, y) {
  const row = source[y];

  if (row && row[x] === false && target[y][x]) {
    source[y][x] = true;
    seedFill(source, target, x - 1, y);
    seedFill(source, target, x + 1, y);
    seedFill(source, target, x, y - 1);
    seedFill(source, target, x, y + 1);
  }
}

// Expand source boolean matrix into target matrix
module.exports.matrixFloodFill = ((source, target) => {
  for (let i = 0; i < source.length; ++i) {
    const row = source[i];

    for (let j = 0; j < row.length; ++j) {
      if (row[j]) {
        seedFill(source, target, j - 1, i);
        seedFill(source, target, j + 1, i);
        seedFill(source, target, j, i - 1);
        seedFill(source, target, j, i + 1);
      }
    }
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
