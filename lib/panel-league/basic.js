const JKISS31 = require('../jkiss');
// FIXME: Import the entire library instead.
const { newBlock, clearBlock, floodFill, shuffleInPlace } = require('./util');

// Block properties
// Non-solid: Null color blocks act as air.
// Solid: The block can be swapped with other blocks and air and is displayed displayed by the UI.
// Floating: If a block has air under it, it will start to float and hang in the air for a while
//           (floatTimer > 1).
// Falling: The float timer has ran out and the block is in free fall one unit per time step
//          (floatTimer in {0, 1}).
// Landed: The block has a solid block beneath it and is no longer in free fall (floatTimer < 0).
// Flashing: The block is part of a match (of 3 or more) and will soon turn into air
//           (flashTimer >= 0).
// Chaining: The block is part of a continuous chain where blocks from a previous match drop into
//           a new match (chaining == true).
// Swapping: The block has begun swapping and is on its way to the new location (swapTimer != 0).

function blocksCanSwap(block1, block2, above1, above2) {
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
  // Prevent "zero fall" chains as they're too easy and look weird.
  if ((above1 && above1.floatTimer > 0) || (above2 && above2.floatTimer > 0)) {
    return false;
  }
  return true;
}


function blocksMatch(block1, block2, bellow1, bellow2) {
  if (!block1 || !block2) {
    return false;
  }
  if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
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
  // Blocks above swapping air are in a limbo.
  // They are floating/falling in terms of gravity, but
  // are still "supported" by the solid block sliding away underneath.
  const block1Floating = block1.floatTimer >= 0;
  const block2Floating = block2.floatTimer >= 0;
  const bellow1Supporting = bellow1 && bellow1.swapTimer && !bellow1.color;
  const bellow2Supporting = bellow2 && bellow2.swapTimer && !bellow2.color;

  if ((block1Floating && !bellow1Supporting) || (block2Floating && !bellow2Supporting)) {
    return false;
  }
  if (block1.color === block2.color) {
    return (!block1.preventMatching && !block2.preventMatching);
  }

  return false;
}


function handleSwapping(state) {
  state.blocks.forEach((block) => {
    if (block.swapTimer > 0) {
      --block.swapTimer;
    } else if (block.swapTimer < 0) {
      ++block.swapTimer;
    }
  });
}


// Match three or more similar blocks horizontally or vertically
function findMatches(state, blocks) {
  let matchFound = false;

  blocks.forEach((block, i) => {
    const bellow = blocks[i + state.width];
    const above = blocks[i - state.width];
    let left;
    let right;
    let leftBellow;
    let rightBellow;

    if (i % state.width > 0) {
      left = blocks[i - 1];
      leftBellow = blocks[(i - 1) + state.width];
    }
    if (i % state.width < state.width - 1) {
      right = blocks[i + 1];
      rightBellow = blocks[(i + 1) + state.width];
    }

    if (
      blocksMatch(left, block, leftBellow, bellow) &&
      blocksMatch(block, right, bellow, rightBellow)
    ) {
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
  do {
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
  } while (true);
  clearMatches(state.blocks, true);
  state.RNG = RNG.serialize();
}


// Fill the grid as balanced as possible.
function refillBlocks(state) {
  const blocks = state.blocks;
  const blockTypes = state.blockTypes;

  state.garbage.length = 0;
  blocks.forEach(clearBlock);
  blocks.forEach((block, index) => {
    block.color = blockTypes[Math.floor(index / 3) % blockTypes.length];
  });
  const RNG = JKISS31.unserialize(state.RNG);
  const random = (() => RNG.step01());
  do {
    shuffleInPlace(blocks, random);
    const matchesFound = findMatches(state, blocks);
    clearMatches(blocks);
    if (!matchesFound) {
      break;
    }
  } while (true);
  state.RNG = RNG.serialize();
}


function handleEvents(state, events) {
  const effects = [];
  const garbage = state.garbage;
  const blocks = state.blocks;
  const isActive = blocks.some((block) => (
    block.flashTimer >= 0 ||
    block.floatTimer >= 0 ||
    block.swapTimer
  ));

  events = events.slice().sort((e1, e2) => {
    if (e1.type < e2.type) {
      return -1;
    } else if (e1.type > e2.type) {
      return 1;
    }
    return e1.index - e2.index;
  });
  if (events.find((event) => event.type === 'clearAll')) {
    blocks.forEach(clearBlock);
    garbage.length = 0;
  }
  events.forEach((event) => {
    if (event.type === 'swap') {
      const index = event.index;

      if (index % state.width < state.width - 1) {
        const block1 = blocks[index];
        const block2 = blocks[index + 1];
        const above1 = blocks[index - state.width];
        const above2 = blocks[(index + 1) - state.width];

        if (blocksCanSwap(block1, block2, above1, above2)) {
          // Upon swapping the blocks immediately warp into their new locations,
          // but receive a swap timer that partially disable them for a while.
          // The UI will display this time as a sliding animation.

          // Block 1 goes left to right
          block1.swapTimer = state.swapTime;
          // Block 2 goes right to left
          block2.swapTimer = -state.swapTime;

          blocks[index] = block2;
          blocks[index + 1] = block1;
        }
      }
    } else if (event.type === 'addRow' && (state.addRowWhileActive || !isActive)) {
      if (blocks.slice(0, state.width).every(block => !block.color)) {
        addRow(state);
        garbage.forEach(slab => ++slab.y);
        effects.push({ type: 'addRow' });
      } else {
        effects.push({ type: 'gameOver' });
      }
    } else if (event.type === 'addGarbage') {
      const slab = Object.assign({}, event.slab);

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
  if (events.find((event) => event.type === 'refill')) {
    refillBlocks(state);
  }

  return effects;
}


function handleGravity(state) {
  const effects = [];
  const blocks = state.blocks;

  for (let i = blocks.length - 1; i >= 0; --i) {
    const block = blocks[i];

    if (!block.color || block.garbage) {
      continue;
    }

    // Floating and falling:
    // A block can float or fall if
    // it is not at ground level and
    // it is not flashing
    // and the (solid) block bellow is not swapping and
    // either beneath there's air or a floating/falling block.

    // Swapping blocks start floating, but wait until
    // the swap completes before continuing with the fall.

    // Having floatTimer === 1 signals that the block has just
    // recently started falling and cannot be swapped.
    const bellow = blocks[i + state.width];
    if (
      bellow &&
      (block.flashTimer < 0) &&
      (!bellow.color || !bellow.swapTimer) &&
      (!bellow.color || bellow.floatTimer >= 0)
    ) {
      if (block.floatTimer < 0) {
        if (bellow.color && !block.swapTimer) {
          block.floatTimer = bellow.floatTimer;
        } else {
          block.floatTimer = state.floatTime + 1;
        }
        block.chaining = (block.chaining || bellow.chaining);
      } else if (block.floatTimer === 0 || block.floatTimer === 1) {
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
      if (block.floatTimer >= 0) {
        effects.push({ type: 'blockLanded', index: i });
      }
      block.floatTimer = -1;
    }
  }

  return effects;
}


function handleChaining(state) {
  floodFill(state, (block, neighbour) => {
    if (block.chaining || !block.matching) {
      return false;
    }
    if (neighbour.chaining && neighbour.matching) {
      block.chaining = true;

      return true;
    }

    return false;
  });
}


function handleTimers(state) {
  // TODO: Extend effects to include information required to play game sounds.
  const blocks = state.blocks;
  const effects = [];
  let matchMade = false;
  let chainMatchMade = false;
  const wasChaining = blocks.some((block) => block.chaining);
  const indicesMatched = [];

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
    // is not swapping and
    // is not on top of a swapping block.
    if (
      block.floatTimer < 0 &&
      block.flashTimer < 0 &&
      !block.swapTimer &&
      !block.matching &&
      (!bellow || !bellow.swapTimer)
    ) {
      block.chaining = false;
    }

    if (block.floatTimer > 0) {
      --block.floatTimer;
    }

    if (!--block.flashTimer) {
      clearBlock(block);
      if (above && above.color) {
        above.chaining = true;
        above.floatTimer = state.floatTime + 1;
      }
      effects.push({
        type: 'flashDone',
        index: i,
      });
    }
    if (block.matching) {
      block.flashTimer = state.flashTime;
      matchMade = true;
      indicesMatched.push(i);
      if (block.chaining) {
        chainMatchMade = true;
      }
    }
  });

  clearMatches(blocks);
  const isChaining = blocks.some((block) => block.chaining);

  if (wasChaining && !isChaining) {
    effects.push({
      type: 'chainDone',
      chainNumber: state.chainNumber,
    });
    state.chainNumber = 0;
  }
  if (chainMatchMade) {
    state.chainNumber++;
    effects.push({
      type: 'chainMatchMade',
      chainNumber: state.chainNumber,
      indices: indicesMatched,
    });
  } else if (matchMade) {
    effects.push({
      type: 'matchMade',
      chainNumber: state.chainNumber,
      indices: indicesMatched,
    });
  }

  return effects;
}


// FIXME: Put these into individual files/modules instead or just convert this
// into proper library and rename it something else than 'basic'.
module.exports = {
  handleSwapping,
  findMatches,
  clearMatches,
  addRow,
  handleEvents,
  handleGravity,
  handleChaining,
  handleTimers,
};
