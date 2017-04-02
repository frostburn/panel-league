const JKISS31 = require('../jkiss');
const basic = require('./basic');
const defaultTo = require('lodash/defaultTo');

const defaultOptions = {
  width: 6,
  height: 8,
  grace: 0,
};

class StandardStepper {
  get name() {
    return 'tetrisStandard';
  }
  initializeState(options) {
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const grace = defaultTo(options.grace, defaultOptions.grace);
    const blocks = options.blocks;
    const pieceQueue = options.pieceQueue;
    const initialRNG = new JKISS31();
    const numBlocks = width * height;

    initialRNG.scramble();
    const state = {
      time: 0,
      width,
      height,
      grace,
      RNG: initialRNG.serialize(),
      blocks: Array(numBlocks).fill(null),
      pieceQueue: [],
      hold: null,
    };
    if (blocks) {
      if (blocks.length !== numBlocks) {
        throw new Error('Dimension mismatch');
      }
      state.blocks = blocks.slice();
    }
    if (pieceQueue) {
      state.pieceQueue = pieceQueue.slice();
    }
    basic.getNextPiece(state);

    return state
  }

  // Modifies state in-place
  step(state, events) {
    const blocks = state.blocks;
    const effects = [];

    ++state.time;

    // Try to avoid game over by jiggling the piece.
    effects.push.apply(effects, basic.handleGameOver(state));

    // Handle input events. Gravity should be implemented as inputs.
    effects.push.apply(effects, basic.handleEvents(state, events));

    // Handle the clearing of lines.
    effects.push.apply(effects, basic.clearLines(state));

    return effects;
  }

  postProcess(state) {
    state.embeddedBlocks = state.blocks.slice();
    basic.embedPiece(state.piece, state.embeddedBlocks, state.width, state.height);
  }
}

function factory(name) {
  switch (name) {
    case 'tetris':
      return new StandardStepper();
    default:
      return null;
  }
}

module.exports = {factory};
