// Block properties
// Non-solid: Null color blocks act as air.
// Solid: The block can be swapped with other blocks and air and is displayed displayed by the UI.
// Floating: If a block has air under it, it will start to float and hang in the air for a while (floatTimer > 0).
// Falling: The float timer has ran out and the block is in free fall one unit per time step (floatTimer == 0).
// Landed: The block has a solid block beneath it and is no longer in free fall (floatTimer < 0).
// Flashing: The block is part of a match (of 3 or more) and will soon turn into air (flashTimer >= 0).
// Chaining: The block is part of a continuous chain where blocks from a previous match drop into a new match (chaining == true).
// Swapping: The block has begun swapping and is on its way to the new location (swapTimer != 0).

const JKISS31 = require('./jkiss');
const {defaultTo} = require('lodash');

const STATE_CACHE_SIZE = 16;
const defaultOptions = {
  width: 6,
  height: 8,
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
  garbageFlashTime: 1,
  initialRows: 3,
  blockTypes: ['red', 'green', 'blue'],
};

function blocksCanSwap(block1, block2) {
  if (!block1 || !block2) {
    return false;
  }
  if (!block1.color && !block2.color) {
    return false;
  }
  if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
    return false;
  }
  if (block1.floatTimer > 0 || block2.floatTimer > 0) {
    return false;
  }
  if (block1.garbage || block2.garbage) {
    return false;
  }
  return true;
}

function blocksMatch(block1, block2) {
  if (!block1 || !block2) {
    return false;
  }
  if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
    return false;
  }
  if (block1.floatTimer >= 0 || block2.floatTimer >= 0) {
    return false;
  }
  if (!block1.color || !block2.color) {
    return false;
  }
  if (block1.swapTimer !== 0 || block2.swapTimer !== 0) {
    return false;
  }
  if (block1.garbage || block2.garbage) {
    return false;
  }
  if (block1.color === block2.color) {
    return (!block1.preventMatching && !block2.preventMatching);
  }
  return false;
}

function newBlock() {
  return {
    color: null,
    flashTimer: -1,
    floatTimer: -1,
    swapTimer: 0,
    chaining: false,
    garbage: false,
  };
}

function clearBlock(block) {
  block.color = null;
  block.flashTimer = -1;
  block.floatTimer = -1;
  block.swapTimer = 0;
  block.chaining = false;
  block.garbage = false;
}

// Match three or more similar blocks horizontally or vertically
function findMatches(state, blocks) {
  let matchFound = false;
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

    if (blocksMatch(left, block) && blocksMatch(block, right)) {
      left.matching = true;
      block.matching = true;
      right.matching = true;
      matchFound = true;
    }

    if (blocksMatch(bellow, block) && blocksMatch(block, above)) {
      above.matching = true;
      block.matching = true;
      bellow.matching = true;
      matchFound = true;
    }
  });
  return matchFound;
}

function invalidateMatches(blocks) {
  blocks.forEach((block) => {
    if (block.matching) {
      block.preventMatching = true;
    }
  });
}

function clearMatches(blocks, includeInvalid) {
  blocks.forEach((block) => {
    delete block.matching;
    if (includeInvalid) {
      delete block.preventMatching;
    }
  });
}

function pushRow(blocks, nextRow, width) {
  for (let i = 0; i < width; ++i) {
    blocks.shift();
    blocks.push(nextRow[i]);
  }
}

function garbageCoordsToIndex(state, x, y) {
  if (x < 0) {
    return undefined;
  }
  if (x >= state.width) {
    return undefined;
  }
  // Guards for y can omitted.
  return x + state.width * (state.height - 1 - y);
}

function garbageCoordsToBlock(state, x, y) {
  return state.blocks[garbageCoordsToIndex(state, x, y)];
}

// Handle gravity for garbage. Slabs fall one grid unit per step.
function handleGarbageGravity(state) {
  const blocks = state.blocks;
  const garbage = state.garbage;

  const RNG = JKISS31.unserialize(state.RNG);
  garbage.forEach((slab) => {
    if (slab.y > 0 && slab.y <= state.height) {
      // We are in the playing grid. See if there are any blocks bellow.
      let bellow = false;
      for (let x = 0; x < slab.width; ++x) {
        const block = garbageCoordsToBlock(state, slab.x + x, slab.y - 1);
        if (block && block.color) {
          bellow = true;
          break;
        }
      }
      if (!bellow) {
        // Make all materialized garbage in this slab fall.
        for (let y = 0; y < slab.height; ++y) {
          for (let x = 0; x < slab.width; ++x) {
            const index = garbageCoordsToIndex(state, slab.x + x, slab.y + y);
            const block = blocks[index];
            if (block) {
              blocks[index] = blocks[index + state.width];
              blocks[index + state.width] = block;
            }
          }
        }
        --slab.y;
        // Materialize new garbage if needed.
        if (slab.y + slab.height >= state.height) {
          for (let x = 0; x < slab.width; ++x) {
            const index = slab.x + x;
            const block = blocks[index];
            block.color = state.blockTypes[RNG.step() % state.blockTypes.length];
            while (
              (x >= 2) &&
              (block.color === blocks[index - 1].color) &&
              (blocks[index - 1].color === blocks[index - 2].color)
            ) {
              block.color = state.blockTypes[RNG.step() % state.blockTypes.length];
            }
            block.garbage = true;
          }
        }
      }
    } else {
      // We are outside of the playing grid. See if there are any slabs bellow.
      const bellow = garbage.some((other) =>
        (other.y + other.height === slab.y) &&
        (other.x < slab.x + slab.width) &&
        (slab.x < other.x + other.width)
      );
      if (!bellow) {
        --slab.y;
      }
    }
  });
  garbage.sort((slab, other) => slab.y - other.y);
  state.RNG = RNG.serialize();
}

function shockGarbage(state) {
  const blocks = state.blocks;
  const garbage = state.garbage;

  const shockableBlocks = [];
  garbage.forEach((slab) => {
    if (slab.flashTimer >= 0) {
      return;
    }
    for (let y = 0; y < slab.height; ++y) {
      for (let x = 0; x < slab.width; ++x) {
        const block = garbageCoordsToBlock(state, slab.x + x, slab.y + y);
        if (block) {
          block.slab = slab;
          shockableBlocks.push(block);
        }
      }
    }
  });

  floodFill(state, (block, neighbour) => {
    if (!block.slab || block.shocking) {
      return false;
    }
    if (neighbour.matching || neighbour.shocking) {
      block.shocking = true;
      const slab = block.slab;
      slab.flashTimer = slab.flashTime;
      return true;
    }
  });

  shockableBlocks.forEach((block) => {
    delete block.shocking;
    delete block.slab;
  });
}

function releaseGarbage(state) {
  const blocks = state.blocks;
  const garbage = state.garbage;

  const slabsToRemove = [];
  garbage.forEach((slab) => {
    if (slab.flashTimer-- !== 0) {
      return;
    }
    for (let x = 0; x < slab.width; ++x) {
      const block = garbageCoordsToBlock(state, slab.x + x, slab.y);
      if (block) {
        block.garbage = false;
        block.chaining = true;
        block.floatTimer = state.floatTime;
      }
    }
    ++slab.y;
    --slab.height;
    if (!slab.height) {
      slabsToRemove.push(slab);
    }
  });
  slabsToRemove.forEach((slab) => garbage.splice(garbage.indexOf(slab), 1));
}

// TODO: Use this function for chaining in Issue #43
function floodFill(state, callback) {
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
}

// When adding rows we must not create new matches unless forced to.
function addRow(state) {
  if (state.nextRow) {
    pushRow(state.blocks, state.nextRow, state.width);
    // Find matches that are forced and exclude them.
    findMatches(state, state.blocks);
    invalidateMatches(state.blocks);
    clearMatches(state.blocks);
  }
  const RNG = JKISS31.unserialize(state.RNG);
  while (true) {
    const nextRow = [];
    for (let i = 0; i < state.width; ++i) {
      const block = newBlock();
      block.color = state.blockTypes[RNG.step() % state.blockTypes.length];
      nextRow.push(block);
    }
    // Make sure that no unnecessary matches would be made when pushing the new row.
    const candidateBlocks = state.blocks.slice();
    pushRow(candidateBlocks, nextRow, state.width);
    const candidateMatches = findMatches(state, candidateBlocks);
    clearMatches(candidateBlocks);
    if (!candidateMatches) {
      state.nextRow = nextRow;
      break;
    }
  }
  clearMatches(state.blocks, true);
  state.RNG = RNG.serialize();
}

function step(stateJSON, events) {
  const state = JSON.parse(stateJSON);
  const blocks = state.blocks;
  const garbage = state.garbage;

  ++state.time;

  // Swap timers need to be handled before setting new swap times through events.
  blocks.forEach((block) => {
    if (block.swapTimer > 0) {
      --block.swapTimer;
    } else if (block.swapTimer < 0) {
      ++block.swapTimer;
    }
  });

  events.slice().sort().forEach((event) => {
    const [, type, param] = event;

    if (type === 'swap') {
      if (param % state.width < state.width - 1) {
        const block1 = blocks[param];
        const block2 = blocks[param + 1];

        if (blocksCanSwap(block1, block2)) {
          // Upon swapping the blocks immediately warp into their new locations,
          // but receive a swap timer that partially disable them for a while.
          // The UI will display this time as a sliding animation.

          // Block 1 goes left to right
          block1.swapTimer = state.swapTime;
          // Block 2 goes right to left
          block2.swapTimer = -state.swapTime;

          blocks[param] = block2;
          blocks[param + 1] = block1;
        }
      }
    } else if (type === 'addRow') {
      if (blocks.slice(0, state.width).every(block => !block.color)) {
        addRow(state);
        garbage.forEach(slab => ++slab.y);
      }
    } else if (type === 'addGarbage') {
      const slab = param;
      if (slab.x + slab.width > state.width) {
        throw new Error('Invalid garbage slab');
      }
      // Place the slab on top of all the other slabs or at the top of the screen.
      slab.y = garbage.reduce(
        (max, s) => Math.max(max, s.y + s.height),
        state.height
      );
      slab.flashTime = state.garbageFlashTime * slab.width * slab.height;
      slab.flashTimer = -1;
      garbage.push(slab);
    }
  });

  // Make garbage slabs fall
  handleGarbageGravity(state);

  // Iterate from bottom to top to handle gravity
  for (let i = blocks.length - 1; i >= 0; --i) {
    const block = blocks[i];

    if (!block.color || block.garbage) {
      continue;
    }

    // Floating and falling:
    // A block can float or fall if
    // it is not at ground level and
    // it is not flashing
    // and the block (or air) bellow is not swapping and
    // either beneath there's air or a floating/falling block.

    // Swapping blocks start floating, but wait until
    // the swap completes before continuing with the fall.
    const bellow = blocks[i + state.width];
    if (
      bellow &&
      (block.flashTimer < 0) &&
      !bellow.swapTimer &&
      (!bellow.color || bellow.floatTimer >= 0)
    ) {
      if (block.floatTimer < 0) {
        if (bellow.color && !block.swapTimer) {
          block.floatTimer = bellow.floatTimer;
        } else {
          block.floatTimer = state.floatTime;
        }
        block.chaining = (block.chaining || bellow.chaining);
      } else if (!block.floatTimer) {
        // Inherit the timer when falling onto a floating block.
        // Only fall through air.
        if (bellow.color) {
          block.floatTimer = bellow.floatTimer;
        } else {
          blocks[i] = bellow;
          blocks[i + state.width] = block;
        }
      }
    } else {
      block.floatTimer = -1;
    }
  }

  // Match three or more similar blocks horizontally or vertically
  findMatches(state, state.blocks);

  // Matches cause shocks through the garbage to eventually clear them up
  shockGarbage(state);

  // Release the bottom rows of clearing garbage slabs
  releaseGarbage(state);

  // Propagate chaining information
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

      if (block.chaining) {
        [left, right, above, bellow].forEach((neighbour) => {
          if (neighbour && neighbour.matching && !neighbour.chaining) {
            neighbour.chaining = true;
            floodFillActive = true;
          }
        });
      }
    });
  }

  // Handle flags and timers and check if we are still chaining matches into more matches
  let chainMatchMade = false;
  let chainAlive = false;
  blocks.forEach((block, i) => {
    const above = blocks[i - state.width];
    const bellow = blocks[i + state.width];

    if (!block.color) {
      block.chaining = false;
    }

    // Chaining ends when a block
    // lands and
    // is not flashing and
    // is not matching and
    // is not on top of a swapping block.
    if (
      block.floatTimer < 0 &&
      block.flashTimer < 0 &&
      !block.matching &&
      (!bellow || !bellow.swapTimer)
    ) {
      block.chaining = false;
    }

    chainAlive = (chainAlive || block.chaining);

    if (block.floatTimer > 0) {
      --block.floatTimer;
    }

    if (!--block.flashTimer) {
      clearBlock(block);
      if (above && above.color) {
        above.chaining = true;
      }
    }
    if (block.matching) {
      block.flashTimer = state.flashTime;
      if (block.chaining) {
        chainMatchMade = true;
      }
    }
  });

  clearMatches(blocks);

  if (!chainAlive) {
    state.chainNumber = 0;
  }
  if (chainMatchMade) {
    state.chainNumber++;
  }

  return JSON.stringify(state);
}

class GameEngine {
  constructor(options = {}) {
    const initialRNG = new JKISS31();
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const colors = options.colors;

    this.time = 0;
    this.eventsByTime = {};
    initialRNG.scramble();
    const state = {
      time: this.time,
      width,
      height,
      flashTime: defaultTo(options.flashTime, defaultOptions.flashTime),
      floatTime: defaultTo(options.floatTime, defaultOptions.floatTime),
      swapTime: defaultTo(options.swapTime, defaultOptions.swapTime),
      garbageFlashTime: defaultTo(options.garbageFlashTime, defaultOptions.garbageFlashTime),
      chainNumber: 0,
      initialRows: defaultTo(options.initialRows, defaultOptions.initialRows),
      RNG: initialRNG.serialize(),
      nextRow: null,
      blocks: Array.from({ length: width * height }, newBlock),
      blockTypes: defaultTo(options.blockTypes, defaultOptions.blockTypes),
      garbage: [],
    };

    if (colors) {
      if (colors.length !== width * height) {
        throw new Error('Dimension mismatch');
      }
      colors.forEach((color, i) => {
        state.blocks[i].color = color;
      });
    } else {
      // The first iteration only populates state.nextRow
      for (let i = 0; i < state.initialRows + 1; ++i) {
        addRow(state);
      }
    }

    this.initialState = JSON.stringify(state);

    // Smart state cache for handling input lag.
    this.statesByTime = new Map();
    this.lastValidTime = this.time;

    Object.defineProperty(this, 'width', { get: () => width });
    Object.defineProperty(this, 'height', { get: () => height });
  }

  step() {
    let state;

    if (!this.lastValidTime) {
      state = this.initialState;
    } else {
      state = this.statesByTime.get(this.lastValidTime);
    }
    if (!state) {
      throw new Error('State cache corrupted');
    }
    for (let instant = this.lastValidTime; instant < this.time; ++instant) {
      const events = this.eventsByTime[instant] || [];
      state = step(state, events);
      this.statesByTime.set(instant + 1, state);
    }
    this.lastValidTime = this.time;
    this.statesByTime.delete(this.lastValidTime - STATE_CACHE_SIZE);
    ++this.time;

    state = JSON.parse(state);
    // Add garbage slab backreferences for the UI.
    state.garbage.forEach((slab) => {
      for (let y = 0; y < slab.height; ++y) {
        for (let x = 0; x < slab.width; ++x) {
          const block = garbageCoordsToBlock(state, slab.x + x, slab.y + y);
          if (block) {
            block.slab = slab;
          }
        }
      }
    });
    return state;
  }

  get colors() {
    const state = this.step();
    --this.time;
    return Array.from(state.blocks, (block) => block.color);
  }

  invalidateCache() {
    this.lastValidTime = 0;
    this.statesByTime = new Map();
  }

  addEvent(eventTime, name, ...args) {
    const events = this.eventsByTime[eventTime] || [];

    if (eventTime <= this.lastValidTime - STATE_CACHE_SIZE) {
      this.invalidateCache();
    } else {
      this.lastValidTime = Math.min(this.lastValidTime, eventTime);
    }
    events.push([eventTime, name, ...args]);
    this.eventsByTime[eventTime] = events;
  }

  exportState() {
    const dump = JSON.stringify({
      state: this.initialState,
      events: this.eventsByTime,
    });
    if (global.btoa) {
      return global.btoa(dump);
    }
    return dump;
  }

  importState(dump) {
    if (global.atob) {
      dump = global.atob(dump);
    }
    const imported = JSON.parse(dump);
    this.invalidateCache();
    this.initialState = imported.state;
    this.eventsByTime = imported.events;
  }

  // Export the earliest available state for cache recreation.
  exportCache() {
    const keys = Array.from(this.statesByTime.keys());
    keys.sort();
    const time = keys[0];
    return {
      time,
      state: this.statesByTime.get(time),
    };
  }

  importCache(data) {
    this.invalidateCache();
    this.lastValidTime = data.time;
    this.statesByTime.set(data.time, data.state);
  }
}

module.exports = GameEngine;
