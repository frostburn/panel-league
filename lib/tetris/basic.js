const JKISS31 = require('../jkiss');

const PIECE_L = [
  [
    0, 0, 0,
    1, 1, 1,
    1, 0, 0,
  ], [
    0, 1, 0,
    0, 1, 0,
    0, 1, 1,
  ], [
    0, 0, 1,
    1, 1, 1,
    0, 0, 0,
  ], [
    1, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ],
];

const PIECE_J = [
  [
    0, 0, 0,
    1, 1, 1,
    0, 0, 1,
  ], [
    0, 1, 1,
    0, 1, 0,
    0, 1, 0,
  ], [
    1, 0, 0,
    1, 1, 1,
    0, 0, 0,
  ], [
    0, 1, 0,
    0, 1, 0,
    1, 1, 0,
  ],
];

const PIECE_T = [
  [
    0, 0, 0,
    1, 1, 1,
    0, 1, 0,
  ], [
    0, 1, 0,
    0, 1, 1,
    0, 1, 0,
  ], [
    0, 1, 0,
    1, 1, 1,
    0, 0, 0,
  ], [
    0, 1, 0,
    1, 1, 0,
    0, 1, 0,
  ],
];

const PIECE_Z = [
  [
    0, 0, 0,
    1, 1, 0,
    0, 1, 1,
  ], [
    0, 1, 0,
    1, 1, 0,
    1, 0, 0,
  ],
];

const PIECE_S = [
  [
    0, 0, 0,
    0, 1, 1,
    1, 1, 0,
  ], [
    0, 0, 1,
    0, 1, 1,
    0, 1, 0,
  ],
];

const PIECE_I = [
  [
    0, 0, 0, 0,
    1, 1, 1, 1,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ], [
    0, 1, 0, 0,
    0, 1, 0, 0,
    0, 1, 0, 0,
    0, 1, 0, 0,
  ],
];

const PIECE_O = [
  [
    1, 1,
    1, 1,
  ],
];

const PIECES = {
  L: PIECE_L,
  J: PIECE_J,
  T: PIECE_T,
  S: PIECE_S,
  Z: PIECE_Z,
  I: PIECE_I,
  O: PIECE_O,
};

function embedPiece(piece, blocks, width, height) {
  const parts = PIECES[piece.type][piece.orientation];
  const size = Math.round(Math.sqrt(parts.length));
  let index = 0;

  for (let y = piece.y; y < piece.y + size; ++y) {
    for (let x = piece.x; x < piece.x + size; ++x) {
      const part = parts[index++];
      const block = blocks[x + y * width];

      if (!part) {
        continue;
      }
      if (x < 0 || x >= width) {
        return false;
      }
      if (y < 0 || y >= height) {
        return false;
      }
      if (block) {
        return false;
      }
      blocks[x + y * width] = piece.type;
    }
  }
  return true;
}

function jigglePiece(piece, blocks, width, height) {
  const originalBlocks = blocks;
  const originalX = piece.x;
  const originalY = piece.y;
  let fits = false;

  [0, 1, 2, -1].forEach(y => {
    if (fits) {
      return;
    }
    [0, -1, 1].forEach(x => {
      if (fits) {
        return;
      }
      blocks = originalBlocks.slice();
      piece.x = originalX + x;
      piece.y = originalY + y;
      if (embedPiece(piece, blocks, width, height)) {
        fits = true;
      }
    });
  })
  return fits;
}

function getNextPiece(state) {
  const RNG = JKISS31.unserialize(state.RNG);
  const types = Object.keys(PIECES);

  state.pieceQueue.push(types[RNG.step() % types.length]);
  state.piece = {
    type: state.pieceQueue.shift(),
    orientation: 0,
    x: 0,
    y: -1,  // All the pieces start out flat so this is OK.
    grace: state.grace,
  };
  state.RNG = RNG.serialize();
}

function moveX(state, event) {
  const sign = Math.sign(event.x);
  const piece = Object.assign({}, state.piece);

  if (!sign) {
    return;
  }
  for (let i = 0; i < Math.abs(event.x); ++i) {
    const blocks = state.blocks.slice();

    piece.x += sign;
    if (!embedPiece(piece, blocks, state.width, state.height)) {
      piece.x -= sign;
      break;
    }
  }
  const delta = piece.x - state.piece.x

  if (delta) {
    state.piece = piece;
    return [{
      type: 'pieceMoved',
      x: delta,
      y: 0,
    }]
  }
  return [];
}

function moveY(state, event) {
  const piece = Object.assign({}, state.piece);
  const effects = [];
  let landed = false;

  for (let i = 0; i < event.y; ++i) {
    const blocks = state.blocks.slice();

    ++piece.y;
    if (!embedPiece(piece, blocks, state.width, state.height)) {
      --piece.y;
      landed = true;
      break;
    }
  }
  if (landed) {
    if (event.hard || --state.piece.grace < 0) {
      effects.push({
        type: 'pieceLanded',
        y: piece.y - state.piece.y,
        hard: event.hard,
      });
      embedPiece(piece, state.blocks, state.width, state.height);
      // TODO: Check if piece is stuck = spin
      getNextPiece(state);
    }
  }
  else {
    effects.push({
      type: 'pieceMoved',
      x: 0,
      y: piece.y - state.piece.y,
    });
    state.piece = piece;
  }
  return effects;
}

function handleEvents(state, events) {
  const piece = state.piece;
  const blocks = state.blocks;
  const effects = [];

  events = events.slice().sort((e1, e2) => {
    if (e1.type < e2.type) {
      return -1;
    } else if (e1.type > e2.type) {
      return 1;
    }
    return e1.index - e2.index;
  });

  events.forEach((event) => {
    if (event.type === 'move') {
      effects.push.apply(effects, moveX(state, event));
      effects.push.apply(effects, moveY(state, event));
    } else if (event.type === 'rotate') {
      const piece = Object.assign({}, state.piece);
      const mod = PIECES[piece.type].length;

      piece.orientation = (piece.orientation + event.amount + mod) % mod;
      if (jigglePiece(piece, state.blocks, state.width, state.height)) {
        state.piece = piece;
        effects.push({
          type: 'pieceRotated',
          amount: event.amount,
        });
      }
    } else if (event.type == 'clear') {
      state.blocks.fill(null);
    }
  });

  return effects;
}

function clearLines(state) {
  const blocks = state.blocks;
  let linesCleared = 0;

  for (let i = 0; i < state.height; ++i) {
    const rowStart = i * state.width;
    const rowEnd = rowStart + state.width;

    if (blocks.slice(rowStart, rowEnd).every(x => !!x)) {
      blocks.splice(rowStart, state.width);
      blocks.unshift.apply(blocks, Array(state.width).fill(null));
      ++linesCleared;
    }
  }
  if (linesCleared) {
    return [{
      type: 'linesCleared',
      num: linesCleared,
    }];
  }
  return [];
}

function handleGameOver(state) {
  if (jigglePiece(state.piece, state.blocks, state.width, state.height)) {
    return [];
  }
  return [{
    type: 'gameOver',
  }];
}

module.exports = {
  embedPiece,
  getNextPiece,
  handleEvents,
  clearLines,
  handleGameOver,
};
