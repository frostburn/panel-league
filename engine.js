/* eslint-env browser */
/* global define */

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
  const WIDTH = 6;
  const HEIGHT = 8;
  const INITIAL_ROWS = 3;

  let time = 0;
  let eventQueue = [];

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
  function findMatches(blocks) {
    let matchFound = false;
    blocks.forEach((block, i) => {
      const bellow = blocks[i + WIDTH];
      const above = blocks[i - WIDTH];
      let left;
      let right;

      if (i % WIDTH > 0) {
        left = blocks[i - 1];
      }
      if (i % WIDTH < WIDTH - 1) {
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

  function pushRow(blocks, nextRow) {
    for (let i = 0; i < WIDTH; ++i) {
      blocks.shift();
      blocks.push(nextRow[i]);
    }
  }

  // When adding rows we must not create new matches unless forced to.
  function addRow(state) {
    if (state.nextRow) {
      pushRow(state.blocks, state.nextRow);
      // Find matches that are forced and exclude them.
      findMatches(state.blocks);
      invalidateMatches(state.blocks);
      clearMatches(state.blocks);
    }
    const RNG = JKISS31.unserialize(state.RNG);
    while (true) {
      const nextRow = [];
      for (let i = 0; i < WIDTH; ++i) {
        const block = newBlock();
        switch (RNG.step() % 3) {
          case 0:
            block.color = "red";
            break;
          case 1:
            block.color = "green";
            break;
          case 2:
            block.color = "blue";
            break;
          default:
            throw new Error("Bogus value from RNG");
            break;
        }
        nextRow.push(block);
      }
      // Make sure that no unnecessary matches would be made when pushing the new row.
      const candidateBlocks = state.blocks.slice();
      pushRow(candidateBlocks, nextRow);
      const candidateMatches = findMatches(candidateBlocks);
      clearMatches(candidateBlocks);
      if (!candidateMatches) {
        state.nextRow = nextRow;
        break;
      }
    }
    clearMatches(state.blocks, true);
    state.RNG = RNG.serialize();
  }

  function prepareRows(stateJSON, numRows) {
    const state = JSON.parse(stateJSON);
    for (let i = 0; i < numRows; ++i) {
      addRow(state);
    }
    return JSON.stringify(state);
  }

  function step(stateJSON, events) {
    const state = JSON.parse(stateJSON);
    const blocks = state.blocks;

    ++state.time;

    // Swap timers need to be handled before setting new swap times through events.
    blocks.forEach((block, i) => {
      if (block.swapTimer > 0) {
        --block.swapTimer;
      }
      else if (block.swapTimer < 0) {
        ++block.swapTimer;
      }
    });

    while (events.length) {
      const [, type, param] = events.pop();

      if (type === 'swap') {
        if (param % WIDTH < WIDTH - 1) {
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
      }
      else if (type == 'addRow') {
        // TODO: Add a signal for game over if touching the roof.
        addRow(state);
      }
    }

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
      const bellow = blocks[i + WIDTH];
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
          blocks[i] = bellow;
          blocks[i + WIDTH] = block;
        }
      } else {
        block.floatTimer = -1;
      }
    }

    // Match three or more similar blocks horizontally or vertically
    findMatches(state.blocks);

    // Propagate chaining information
    let floodFillActive = true;
    while (floodFillActive) {
      floodFillActive = false;
      blocks.forEach((block, i) => {
        const bellow = blocks[i + WIDTH];
        const above = blocks[i - WIDTH];
        let left;
        let right;

        if (i % WIDTH > 0) {
          left = blocks[i - 1];
        }
        if (i % WIDTH < WIDTH - 1) {
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
      const above = blocks[i - WIDTH];

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

  let initialRNG = new JKISS31();
  initialRNG.scramble();
  initialRNG = initialRNG.serialize();

  let initialState = JSON.stringify({
    time: 0,
    flashTime: 3,
    floatTime: 2,
    swapTime: 2,
    chainNumber: 0,
    initialRows: INITIAL_ROWS,
    RNG: initialRNG,
    nextRow: null,
    blocks: (() => {
      const blocks = [];
      for (let i = 0; i < WIDTH * HEIGHT; ++i) {
        blocks.push(newBlock());
      }
      return blocks;
    })(),
  });

  return {
    width: WIDTH,
    height: HEIGHT,

    getTime() {
      return time;
    },

    setTime(newTime) {
      time = newTime;
    },

    step() {
      const eventsByTime = {};
      let state = initialState;
      const initialRows = JSON.parse(initialState).initialRows;
      state = prepareRows(state, initialRows + 1);

      eventQueue.forEach((event) => {
        const events = eventsByTime[event[0]] || [];

        events.push(event);
        eventsByTime[event[0]] = events;
      });
      for (let instant = 0; instant < time; ++instant) {
        const events = eventsByTime[instant] || [];

        state = step(state, events);
      }
      ++time;

      return JSON.parse(state);
    },

    addEvent(eventTime, name, ...args) {
      eventQueue.push([eventTime, name, ...args]);
    },

    exportState() {
      return global.btoa(JSON.stringify({
        state: initialState,
        events: eventQueue,
      }));
    },

    importState(dump) {
      const imported = JSON.parse(global.atob(dump));

      initialState = imported.state;
      eventQueue = imported.events;
    },
  };

  // TODO: Multiplayer
  // http://socket.io/get-started/chat/
});
