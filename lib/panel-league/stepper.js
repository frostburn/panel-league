const JKISS31 = require('../jkiss');
const {blockTypes, newBlock} = require('./util');
const basic = require('./basic');
const garbage = require('./garbage');
const {scoring} = require('./constant');
const defaultTo = require('lodash/defaultTo');

const defaultOptions = {
  width: 6,
  height: 8,
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
  garbageFlashTime: 1,
  initialRows: 3,
  blockTypes: blockTypes,
  addRowWhileActive: true,
  scoringSystem: 'puzzleLeague',
};

class StandardStepper {
  get name() {
    return 'panelLeagueStandard';
  }
  initializeState(options) {
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const colors = options.colors;
    const initialRNG = new JKISS31();
    const numBlocks = width * height;

    initialRNG.scramble();
    const state = {
      time: 0,
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
      blocks: Array.from({ length: numBlocks }, newBlock),
      blockTypes: defaultTo(options.blockTypes, defaultOptions.blockTypes),
      addRowWhileActive: defaultTo(options.addRowWhileActive, defaultOptions.addRowWhileActive),
      garbage: [],
    };

    if (colors) {
      if (colors.length !== numBlocks) {
        throw new Error('Dimension mismatch');
      }
      colors.forEach((color, i) => {
        state.blocks[i].color = color;
      });
    } else {
      // The first iteration only populates state.nextRow
      for (let i = 0; i < state.initialRows + 1; ++i) {
        basic.addRow(state);
      }
    }
    return state
  }

  // Modifies state in-place
  step(state, events) {
    const blocks = state.blocks;
    let effects = [];

    ++state.time;

    // Swap timers need to be handled before setting new swap times through events.
    basic.handleSwapping(state);

    // Handle input events
    effects = effects.concat(basic.handleEvents(state, events));

    // Make garbage slabs fall
    garbage.handleGarbageGravity(state);

    // Iterate from bottom to top to handle gravity
    effects = effects.concat(basic.handleGravity(state));

    // Match three or more similar blocks horizontally or vertically
    basic.findMatches(state, state.blocks);

    // Matches cause shocks through the garbage to eventually clear them up
    garbage.shockGarbage(state);

    // Release the bottom rows of clearing garbage slabs
    garbage.releaseGarbage(state);

    // Propagate chaining information
    basic.handleChaining(state);

    // Handle flags and timers and check if we are still chaining matches into more matches
    effects = effects.concat(basic.handleTimers(state));

    return effects;
  }

  // Add extra backreferences that don't need to be cached
  postProcess(state) {
    state.garbage.forEach((slab) => {
      for (let y = 0; y < slab.height; ++y) {
        for (let x = 0; x < slab.width; ++x) {
          const block = garbage.garbageCoordsToBlock(state, slab.x + x, slab.y + y);
          if (block) {
            block.slab = slab;
          }
        }
      }
    });
  }
}

class ScoringStepper extends StandardStepper {
  get name() {
    return 'panelLeagueScoring';
  }
  initializeState(options) {
    const state = super.initializeState(options);
    state.scoringSystem = defaultTo(options.scoringSystem, defaultOptions.scoringSystem);
    state.score = 0;
    return state;
  }

  step(state, events) {
    const effects = super.step(state, events);
    effects.forEach((effect) =>{
      switch (effect.type) {
        case 'gameOver':
          state.score = 0;
          break;
        case 'addRow':
          state.score += 1;
          break;
        case 'chainMatchMade':
          state.score += this.getScore(state, effect);
          break;
        case 'matchMade':
          state.score += this.getScore(state, effect);
          break;
      }
    });
    return effects;
  }

  getScore(state, effect) {
    if (!(state.scoringSystem in scoring)) {
      throw new Error('Unknown scoring system');
    }
    const numBlocks = effect.indices.length;
    const chainNumber = effect.chainNumber;
    const combo = scoring[state.scoringSystem].combo;
    const chain = scoring[state.scoringSystem].chain;
    let score = 0;
    // One "pop" per block
    score += 10 * numBlocks;
    // Combos
    if (numBlocks >= 4) {
      score += combo[Math.min(numBlocks - 4, combo.length - 1)];
    }
    // Chains and bonuses
    if (chainNumber) {
      if (chainNumber - 1 < chain.length) {
        score += chain[chainNumber - 1];
      } else if (state.scoringSystem === 'puzzleLeague') {
        score += chain[chain.length - 1];
      }
    }
    return score;
  }
}

class VsStepper extends StandardStepper {
  get name() {
    return 'panelLeagueVs';
  }
  initializeState(options) {
    const numPlayers = defaultTo(options.numPlayers, 2);
    const parentState = {
      time: 0,
      numPlayers: numPlayers,
      childStates: [],
      nextEvents: {},
    }
    for (let player = 0; player < numPlayers; ++player) {
      const childState = super.initializeState(options);
      childState.player = player;
      childState.score = 0;
      parentState.childStates.push(childState);
      parentState.nextEvents[player] = [];
    }
    return parentState;
  }

  step(parentState, events) {
    const numPlayers = parentState.numPlayers;
    const effects = [];

    ++parentState.time;
    events.forEach((event) => {
      parentState.nextEvents[event.player].push(event);
    });
    const effectsByChild = {};
    for (let player = 0; player < numPlayers; ++player) {
      const childState = parentState.childStates[player];
      const childEvents = parentState.nextEvents[player];
      const childEffects = super.step(childState, childEvents);
      effectsByChild[player] = childEffects;
      parentState.nextEvents[player] = [];
    }
    for (let player = 0; player < numPlayers; ++player) {
      effectsByChild[player].forEach((effect) => {
        effect.player = player;
        effects.push(effect);
        this.pushOwnEvent(parentState, effect, player);
      });
      for (let other = 0; other < numPlayers; ++other) {
        if (other == player) {
          continue;
        }
        effectsByChild[player].forEach((effect) => {
          this.pushOpponentEvent(
            parentState,
            effect,
            player,
            other
          );
        });
      }
    }
    return effects;
  }

  pushOwnEvent(parentState, effect, player) {
    const nextEvents = parentState.nextEvents[player];
    const childState = parentState.childStates[player];
    if (effect.type == 'gameOver') {
      --childState.score;
      nextEvents.push({
        receiver: player,
        type: 'clearAll',
      });
      for (let i = 0; i < childState.initialRows; ++i) {
        nextEvents.push({
          receiver: player,
          type: 'addRow',
        });
      }
    }
  }

  pushOpponentEvent(parentState, effect, sender, receiver) {
    const nextEvents = parentState.nextEvents[receiver];
    const slabs = garbage.effectToSlabs(effect, parentState.childStates[receiver]);

    slabs.forEach((slab) => {
      nextEvents.push({
        sender,
        receiver,
        type: 'addGarbage',
        slab,
      });
    });
  }

  postProcess(parentState) {
    parentState.childStates.forEach((childState) => {
      super.postProcess(childState);
    });
  }
}

const factory = ((name) => {
  switch (name) {
    case 'panelLeagueStandard':
      return new StandardStepper();
    case 'panelLeagueScoring':
      return new ScoringStepper();
    case 'panelLeagueVs':
      return new VsStepper();
    default:
      return null;
  }
});

module.exports = {factory};
