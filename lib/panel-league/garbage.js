const uuidV4 = require('uuid/v4');

const JKISS31 = require('../jkiss');
const {floodFill} = require('./util');

const garbageCoordsToIndex = ((state, x, y) => {
  if (x < 0) {
    return undefined;
  }
  if (x >= state.width) {
    return undefined;
  }
  // Guards for y can omitted.
  return x + state.width * (state.height - 1 - y);
});

const garbageCoordsToBlock = ((state, x, y) => {
  return state.blocks[garbageCoordsToIndex(state, x, y)];
});

// Handle gravity for garbage. Slabs fall one grid unit per step.
const handleGarbageGravity = ((state) => {
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
});

const shockGarbage = ((state) => {
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
});

const releaseGarbage = ((state) => {
  const blocks = state.blocks;
  const garbage = state.garbage;

  const slabsToRemove = [];
  garbage.forEach((slab) => {
    if (slab.flashTimer-- !== 0) {
      return;
    }
    state.dirty = true;
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
});


const comboToSlabs = ((args) => {
  const { minWidth, state } = args;
  let slabs = [];
  let size = args.size;
  let x = 0;

  if (size < minWidth) {
    size = minWidth;
  }
  if (size > state.width) {
    let overflow = (size % state.width);

    if (overflow === 0) {
      overflow = state.width;
    }
    const breakSize = Math.floor(overflow / 2) + minWidth;
    const extraSlabs = comboToSlabs({
      size: size - breakSize,
      minWidth,
      state
    });
    slabs = slabs.concat(extraSlabs);
    size = breakSize;
  }
  if (size === minWidth) {
    let right = 0;
    let left = 0;

    state.garbage.filter(slab => slab.width === minWidth).forEach((slab) => {
      if (slab.x === 0) {
        ++left;
      } else {
        ++right;
      }
    });
    if (left > right) {
      x = minWidth;
    }
  } else if (size < state.width) {
    const RNG = JKISS31.unserialize(state.RNG);
    x = (RNG.step() % (state.width - size));
    state.RNG = RNG.serialize();
  }
  slabs.push({
    x,
    uuid: uuidV4(),
    width: size,
    height: 1,
  });

  return slabs;
});

const effectToSlabs = ((effect, state) => {
  switch (effect.type) {
    case 'matchMade':
    case 'chainMatchMade':
      if (effect.indices.length > 3) {
        return comboToSlabs({
          size: effect.indices.length - 1,
          minWidth: 3,
          state,
        });
      }
      break;
    case 'chainDone':
      if (effect.chainNumber) {
        return [{
          x: 0,
          uuid: uuidV4(),
          width: state.width,
          height: effect.chainNumber,
        }]
      }
      break;
    default:
      break;
  }

  return [];
});

module.exports = {
  garbageCoordsToBlock,
  handleGarbageGravity,
  shockGarbage,
  releaseGarbage,
  effectToSlabs,
};
