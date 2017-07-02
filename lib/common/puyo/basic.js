const range = require('lodash/range');

const maxGroupSize = 8;
const maxChainNumber = 24;
const maxClearBonus = 999;

const colorBonuses = [0, 0, 3, 6, 12, 24];
const groupBonuses = [0, 2, 3, 4, 5, 6, 7, 10];
const chainPowers = [
  0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288,
  320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672,
];
const dropScore = 10;

const maxNuisanceRows = 5;
const emptyPuyo = 0;
const nuisancePuyo = -1;

// This is essentially hard inlined bellow twice for performance.
function neighbours(index, width, height) {
  const x = index % width;
  const y = Math.floor(index / width);
  const indices = [];

  if (x > 0) {
    indices.push([index - 1, 'left']);
  }
  if (x < width - 1) {
    indices.push([index + 1, 'right']);
  }
  if (y > 0) {
    indices.push([index - width, 'top']);
  }
  if (y < height - 1) {
    indices.push([index + width, 'bottom']);
  }

  return indices;
}

function extractGroup(blocks, index, width, height) {
  const x = index % width;
  const y = Math.floor(index / width);
  const color = blocks[index];
  const group = [index];

  blocks[index] = emptyPuyo;
  if (x > 0 && blocks[index - 1] === color) {
    group.push(...extractGroup(blocks, index - 1, width, height));
  }
  if (x < width - 1 && blocks[index + 1] === color) {
    group.push(...extractGroup(blocks, index + 1, width, height));
  }
  if (y > 0 && blocks[index - width] === color) {
    group.push(...extractGroup(blocks, index - width, width, height));
  }
  if (y < height - 1 && blocks[index + width] === color) {
    group.push(...extractGroup(blocks, index + width, width, height));
  }
  return group;
}

function findGroups(blocks, width, height) {
  const groups = [];

  blocks = blocks.slice();
  for (let i = 0; i < blocks.length; ++i) {
    const color = blocks[i];

    if (color > emptyPuyo) {
      const indices = extractGroup(blocks, i, width, height);

      groups.push({ color, indices });
    }
  }
  return groups;
}

function clearGroup(group, blocks, width, height) {
  const nuisanceIndices = [];

  group.indices.forEach((index) => {
    const x = index % width;
    const y = Math.floor(index / width);

    blocks[index] = emptyPuyo;

    if (x > 0 && blocks[index - 1] === nuisancePuyo) {
      blocks[index - 1] = emptyPuyo;
      nuisanceIndices.push(index - 1);
    }
    if (x < width - 1 && blocks[index + 1] === nuisancePuyo) {
      blocks[index + 1] = emptyPuyo;
      nuisanceIndices.push(index + 1);
    }
    if (y > 0 && blocks[index - width] === nuisancePuyo) {
      blocks[index - width] = emptyPuyo;
      nuisanceIndices.push(index - width);
    }
    if (y < height - 1 && blocks[index + width] === nuisancePuyo) {
      blocks[index + width] = emptyPuyo;
      nuisanceIndices.push(index + width);
    }
  });

  return nuisanceIndices;
}

function clearLiveGroups(state, blocks, effects) {
  const colors = {};

  let numCleared = 0;
  let groupBonus = 0;
  findGroups(blocks, state.width, state.height).forEach((group) => {
    const size = group.indices.length;
    if (size < state.clearThreshold) {
      return;
    }
    const nuisanceIndices = clearGroup(group, blocks, state.width, state.height);
    if (nuisanceIndices.length) {
      effects.push({
        color: nuisancePuyo,
        indices: nuisanceIndices,
      });
    }
    colors[group.color] = true;
    numCleared += size;
    const groupSize = Math.min(size - state.clearThreshold, maxGroupSize);
    groupBonus += groupBonuses[groupSize];
    effects.push(group);
  });

  const chainNumber = Math.min(state.chainNumber, maxChainNumber);
  const colorBonus = colorBonuses[Object.keys(colors).length];
  const chainPower = chainPowers[chainNumber];

  let clearBonus = chainPower + colorBonus + groupBonus;
  clearBonus = Math.max(1, Math.min(maxClearBonus, clearBonus));

  return 10 * numCleared * clearBonus;
}

function clearGroups(state) {
  const effects = [];
  const liveBlocks = state.blocks.splice(state.width * state.ghostHeight);
  const score = clearLiveGroups(state, liveBlocks, effects);

  state.blocks = state.blocks.concat(liveBlocks);
  effects.forEach((effect) => {
    effect.type = 'groupCleared';
    effect.indices = effect.indices.map(i => i + (state.ghostHeight * state.width));
    effect.indices.sort((a, b) => a - b);
  });
  if (score) {
    effects.push({
      type: 'score',
      score,
    });
  }
  return effects;
}

function eventSort(event1, event2) {
  if (event1.type < event2.type) {
    return -1;
  } else if (event1.type > event2.type) {
    return 1;
  }
  if (event1.type === 'addPuyos') {
    if (event1.blocks < event2.blocks) {
      return -1;
    } else if (event1.blocks > event2.blocks) {
      return 1;
    }
  }
  return 0;
}

function handleEvents(state, events) {
  // Sort to make simultaneous events deterministic.
  events = events.slice().sort(eventSort);
  events.forEach((event) => {
    if (event.type === 'addPuyos') {
      state.blocks.unshift(...event.blocks);
      state.chainScore += dropScore;
      state.totalScore += dropScore;
      state.dropScore += dropScore;
    }
  });
  return [];
}

function dropOnce(blocks, indices, width) {
  let didDrop = 0;
  for (let i = blocks.length - 1; i >= 0; --i) {
    const above = blocks[i - width];

    if (above && !blocks[i]) {
      blocks[i] = above;
      blocks[i - width] = emptyPuyo;
      indices[i] = indices[i - width];
      indices[i - width] = -1;
      didDrop = 1;
    }
  }
  return didDrop;
}

function handleGravity(state) {
  const indices = range(state.blocks.length);
  const effects = [];
  const offset = state.blocks.length - (state.height + state.ghostHeight) * state.width;

  while (dropOnce(state.blocks, indices, state.width));
  indices.forEach((newIndex, index) => {
    if (newIndex < 0 || newIndex === index) {
      return;
    }
    effects.push({
      type: 'puyoDropped',
      color: state.blocks[index],
      to: index - offset,
      from: newIndex - offset,
    });
  });
  return effects;
}

function removeExtraPuyos(state) {
  const numBlocks = state.width * (state.height + state.ghostHeight);

  state.blocks = state.blocks.splice(state.blocks.length - numBlocks);
  return [];
}

function sendNuisance(state) {
  const score = state.chainScore + state.leftoverScore;

  let nuisanceSent = Math.floor(score / state.targetScore);
  state.leftoverScore = score % state.targetScore;
  if (state.pendingNuisance >= nuisanceSent) {
    state.pendingNuisance -= nuisanceSent;
    nuisanceSent = 0;
  } else {
    nuisanceSent -= state.pendingNuisance;
    state.pendingNuisance = 0;
  }
  state.chainScore = 0;
  state.dropScore = 0;
  return nuisanceSent;
}

function receiveNuisance(state) {
  if (!state.pendingNuisance) {
    return [];
  }
  let nuisanceReceived = Math.min(state.pendingNuisance, state.width * maxNuisanceRows);
  state.pendingNuisance -= nuisanceReceived;
  const rows = [];
  while (nuisanceReceived) {
    let nuisancePlaced = Math.min(nuisanceReceived, state.width);
    nuisanceReceived -= nuisancePlaced;
    const row = Array(state.width).fill(emptyPuyo);
    while (nuisancePlaced) {
      row[state.nuisanceX] = nuisancePuyo;
      state.nuisanceX = (state.nuisanceX + 1) % state.width;
      --nuisancePlaced;
    }
    rows.push(...row);
  }
  state.blocks.unshift(...rows);
  const effects = handleGravity(state);

  removeExtraPuyos(state);

  return effects;
}

function randomDeal(RNG, numColors) {
  return [1 + (RNG.step() % numColors), 1 + (RNG.step() % numColors)];
}

function makePuyos(x, orientation, deal, width) {
  orientation -= Math.floor(orientation / 4) * 4;
  const maxX = width - (orientation % 2);

  let x1 = Math.max(0, Math.min(maxX, x));
  let x2 = x1;
  let y1 = 0;
  let y2 = 1;
  if (orientation === 1) {
    ++x2;
    --y2;
  } else if (orientation === 2) {
    ++y1;
    --y2;
  } else if (orientation === 3) {
    ++x1;
    --y2;
  }
  const rows = Array(2 * width).fill(emptyPuyo);

  rows[x1 + (width * y1)] = deal[0];
  rows[x2 + (width * y2)] = deal[1];
  return rows;
}

function randomPuyos(RNG, deal, width) {
  const orientation = RNG.step() % 4;
  const maxX = width - (orientation % 2);

  return makePuyos(RNG.step() % maxX, orientation, deal, width);
}

function dealForPlayer(parentState, player) {
  return parentState.deals[parentState.childStates[player].dealIndex];
}

function puyosMatchDeal(blocks, deal, width) {
  const height = blocks.length / width;
  const testBlocks = blocks.slice();

  for (let i = 0; i < deal.length; ++i) {
    const index = testBlocks.indexOf(deal[i]);

    if (index < 0) {
      return false;
    }
    testBlocks[index] = emptyPuyo;
  }
  if (testBlocks.some(x => x)) {
    return false;
  }
  // Now we know that all of the puyos in the deal are there and none are left over.
  if (deal.length !== 2) {
    throw new Error('Only classic pieces supported');
  }
  const index = blocks.indexOf(deal[0]);
  const x = index % width;
  const y = Math.floor(index / width);

  if (x > 0 && blocks[index - 1]) {
    return true;
  }
  if (x < (width - 1) && blocks[index + 1]) {
    return true;
  }
  if (y > 0 && blocks[index - width]) {
    return true;
  }
  if (y < (height - 1) && blocks[index + width]) {
    return true;
  }
  return false;
}

module.exports = {
  emptyPuyo,
  nuisancePuyo,
  maxNuisanceRows,
  clearGroups,
  handleGravity,
  handleEvents,
  removeExtraPuyos,
  sendNuisance,
  receiveNuisance,
  randomDeal,
  makePuyos,
  randomPuyos,
  dealForPlayer,
  puyosMatchDeal,
  neighbours,
};
