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
