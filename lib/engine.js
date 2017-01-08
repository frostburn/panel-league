/* eslint-env browser */
/* global define JKISS31 */

// Block properties
// Non-solid: Null color blocks act as air.
// Solid: The block can be swapped with other blocks and air and is displayed displayed by the UI.
// Floating: If a block has air under it, it will start to float and hang in the air for a while (floatTimer > 0).
// Falling: The float timer has ran out and the block is in free fall one unit per time step (floatTimer == 0).
// Landed: The block has a solid block beneath it and is no longer in free fall (floatTimer < 0).
// Flashing: The block is part of a match (of 3 or more) and will soon turn into air (flashTimer >= 0).
// Chaining: The block is part of a continuous chain where blocks from a previous match drop into a new match (chaining == true).
// Swapping: The block has begun swapping and is on its way to the new location (swapTimer != 0).

((global, factory) => {
  const GameEngine = factory(global);

  if (typeof module === 'object' && module != null && module.exports) {
    module.exports = GameEngine;
  } else if (typeof define === 'function' && define.amd) {
    define(() => GameEngine);
  } else {
    global.GameEngine = GameEngine;
  }
})(typeof window !== 'undefined' ? window : this, (global) => {
  const STATE_CACHE_SIZE = 16;
  const defaultOptions = {
    width: 6,
    height: 8,
    flashTime: 3,
    floatTime: 3,
    swapTime: 2,
    initialRows: 3,
  };

  function blocksValid(block1, block2) {
    if (!block1 || !block2) {
      return false;
    }
    if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
      return false;
    }
    if (block1.floatTimer > 0 || block2.floatTimer > 0) {
      return false;
    }

    return true;
  }

  function blocksCanSwap(block1, block2) {
    return blocksValid(block1, block2);
  }

  function blocksMatch(block1, block2) {
    if (!blocksValid(block1, block2)) {
      return false;
    }
    if (block1.floatTimer === 0 || block2.floatTimer === 0) {
      return false;
    }
    if (!block1.color || !block2.color) {
      return false;
    }
    if (block1.swapTimer !== 0 || block2.swapTimer !== 0) {
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
    };
  }

  function clearBlock(block) {
    block.color = null;
    block.flashTimer = -1;
    block.floatTimer = -1;
    block.swapTimer = 0;
    block.chaining = false;
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
        switch (RNG.step() % 3) {
          case 0:
            block.color = 'red';
            break;
          case 1:
            block.color = 'green';
            break;
          case 2:
            block.color = 'blue';
            break;
          default:
            throw new Error('Bogus value from RNG');
        }
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

    ++state.time;

    // Swap timers need to be handled before setting new swap times through events.
    blocks.forEach((block) => {
      if (block.swapTimer > 0) {
        --block.swapTimer;
      } else if (block.swapTimer < 0) {
        ++block.swapTimer;
      }
    });

    events.forEach((event) => {
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
        // TODO: Add a signal for game over if touching the roof.
        addRow(state);
      }
    });

    // Iterate from bottom to top to handle gravity
    for (let i = blocks.length - 1; i >= 0; --i) {
      const block = blocks[i];

      if (!block.color) {
        continue;
      }

      // Floating and falling:
      // A block can float or fall if
      // it is not at ground level and
      // it is not swapping and
      // either beneath there's air or a floating/falling block that is not swapping.
      const bellow = blocks[i + state.width];
      if (
        bellow &&
        !block.swapTimer &&
        (!bellow.color || (bellow.floatTimer >= 0 && !bellow.swapTimer))
      ) {
        if (block.floatTimer < 0) {
          if (bellow.color) {
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

      if (!block.color) {
        block.chaining = false;
      }

      if (block.floatTimer < 0 && block.flashTimer < 0 && !block.matching) {
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

  function GameEngine(options = {}) {
    const initialRNG = new JKISS31();

    this.width = (options.width || defaultOptions.width);
    this.height = (options.height || defaultOptions.height);
    this.time = 0;
    this.eventsByTime = {};
    initialRNG.scramble();
    const state = {
      time: this.time,
      width: this.width,
      height: this.height,
      flashTime: (options.flashTime || defaultOptions.flashTime),
      floatTime: (options.floatTime || defaultOptions.floatTime),
      swapTime: (options.swapTime || defaultOptions.swapTime),
      chainNumber: 0,
      initialRows: (options.initialRows || defaultOptions.initialRows),
      RNG: initialRNG.serialize(),
      nextRow: null,
      blocks: Array.from({ length: this.width * this.height }, newBlock),
    };

    // The first iteration only populates state.nextRow
    for (let i = 0; i < state.initialRows + 1; ++i) {
      addRow(state);
    }

    this.initialState = JSON.stringify(state);

    // Smart state cache for handling input lag.
    this.statesByTime = {};
    this.lastValidTime = this.time;
  }

  GameEngine.prototype.step = function () {
    let state;
    if (!this.lastValidTime) {
      state = this.initialState;
    }
    else {
      state = this.statesByTime[this.lastValidTime];
    }
    if (!state) {
      throw new Error("State cache corrupted");
    }
    for (let instant = this.lastValidTime; instant < this.time; ++instant) {
      const events = this.eventsByTime[instant] || [];
      state = step(state, events);
      this.statesByTime[instant + 1] = state;
    }
    this.lastValidTime = this.time;
    delete this.statesByTime[this.lastValidTime - STATE_CACHE_SIZE];
    ++this.time;

    return JSON.parse(state);
  };

  GameEngine.prototype.invalidateCache = function () {
    this.lastValidTime = 0;
    this.statesByTime = {};
  }

  GameEngine.prototype.addEvent = function (eventTime, name, ...args) {
    this.lastValidTime = Math.min(this.lastValidTime, eventTime);
    const events = this.eventsByTime[eventTime] || [];
    events.push([eventTime, name, ...args]);
    this.eventsByTime[eventTime] = events;
  };

  GameEngine.prototype.exportState = function () {
    return global.btoa(JSON.stringify({
      state: this.initialState,
      events: this.eventsByTime,
    }));
  };

  GameEngine.prototype.importState = function (dump) {
    const imported = JSON.parse(global.atob(dump));

    this.invalidateCache();
    this.initialState = imported.state;
    this.eventsByTime = imported.events;
  };

  return GameEngine;
  // TODO: Multiplayer
  // http://socket.io/get-started/chat/
});
