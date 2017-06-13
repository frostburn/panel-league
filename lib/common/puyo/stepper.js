const JKISS31 = require('../jkiss');
const basic = require('./basic');
const defaultTo = require('lodash/defaultTo');

const defaultOptions = {
  width: 6,
  height: 12,
  ghostHeight: 1,
  clearThreshold: 4,
  numColors: 4,
  targetScore: 70,
  numDeals: 3,
};

class BasicStepper {
  get name() {
    return 'puyo:basic';
  }

  initializeState(options) {
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const clearThreshold = defaultTo(options.clearThreshold, defaultOptions.clearThreshold);
    const targetScore = defaultTo(options.targetScore, defaultOptions.targetScore);
    const ghostHeight = defaultTo(options.ghostHeight, defaultOptions.ghostHeight);
    const colors = options.colors;
    const numBlocks = width * (height + ghostHeight);

    const state = {
      time: 0,
      totalScore: 0,
      chainScore: 0,
      leftoverScore: 0,
      chainNumber: 0,
      allClearBonus: 0,
      pendingNuisance: 0,
      nuisanceX: 0,
      gameOvers: 0,
      width,
      height,
      ghostHeight,
      targetScore,
      clearThreshold,
      blocks: Array(numBlocks).fill(basic.emptyPuyo),
    };

    if (colors) {
      if (colors.length !== numBlocks) {
        throw new Error('Dimension mismatch');
      }
      colors.forEach((color, i) => {
        state.blocks[i] = color;
      });
    }
    return state;
  }

  step(state, events) {
    const effects = [];

    effects.push(...basic.handleEvents(state, events));
    effects.push(...basic.handleGravity(state));
    effects.push(...basic.removeExtraPuyos(state));
    effects.push(...basic.clearGroups(state));
    let score = 0;
    effects.forEach((effect) => {
      if (effect.type === 'score') {
        score = effect.score;
      }
    });
    if (score) {
      ++state.chainNumber;
      state.chainScore += score;
      state.totalScore += score;
      const allClearBonus = state.blocks.every(puyo => puyo === basic.emptyPuyo);
      if (allClearBonus) {
        state.allClearBonus = true;
      }
    } else {
      state.chainNumber = 0;
    }
    ++state.time;
    return effects;
  }

  postProcess() {}
}

class EndlessStepper extends BasicStepper {
  get name() {
    return 'puyo:endless';
  }

  initializeState(options) {
    const numColors = defaultTo(options.numColors, defaultOptions.numColors);
    const numDeals = defaultTo(options.numDeals, defaultOptions.numDeals);
    const initialRNG = new JKISS31();
    const state = super.initializeState(options);

    initialRNG.scramble();
    state.deals = Array.from({ length: numDeals }, () => basic.randomDeal(initialRNG, numColors));
    state.RNG = initialRNG.serialize();
    state.numColors = numColors;
    state.numDeals = numDeals;

    return state;
  }

  step(state, events) {
    const hadChain = !!state.chainNumber;
    const effects = super.step(state, events);

    events.forEach((event) => {
      if (event.type === 'addPuyos' && basic.puyosMatchDeal(event.blocks, state.deals[0], state.width)) {
        const RNG = JKISS31.unserialize(state.RNG);

        state.deals.push(basic.randomDeal(RNG, state.numColors));
        state.deals.shift();
        state.RNG = RNG.serialize();
      }
    });
    if (hadChain && !state.chainNumber) {
      state.chainScore = 0;
    }
    if (state.allClearBonus) {
      state.totalScore += 8500;
      state.allClearBonus = false;
    }
    if (state.blocks.every(block => block !== basic.emptyPuyo)) {
      state.blocks.fill(basic.emptyPuyo);
      ++state.gameOvers;
    }
    return effects;
  }
}

class DuelStepper extends BasicStepper {
  get name() {
    return 'puyo:duel';
  }

  initializeState(options) {
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const numPlayers = defaultTo(options.numPlayers, 2);
    const numColors = defaultTo(options.numColors, defaultOptions.numColors);
    const numDeals = defaultTo(options.numDeals, defaultOptions.numDeals);
    const initialRNG = new JKISS31();
    const parentState = {
      time: 0,
      numColors,
      numPlayers,
      numDeals,
      width,
      height,
      childStates: [],
    };

    parentState.deals = Array.from(
      { length: numDeals },
      () => basic.randomDeal(initialRNG, numColors)
    );
    parentState.RNG = initialRNG.serialize();
    for (let player = 0; player < numPlayers; ++player) {
      const childState = super.initializeState(options);
      childState.player = player;
      childState.dealIndex = 0;
      parentState.childStates.push(childState);
    }
    return parentState;
  }

  step(state, events) {
    const effects = [];
    const eventsForPlayer = {};
    const hasStepped = {};
    const nuisanceReceivers = [];

    let gameOver = false;
    ++state.time;
    for (let i = 0; i < state.numPlayers; ++i) {
      eventsForPlayer[i] = [];
    }
    events.forEach((event) => {
      eventsForPlayer[event.player].push(event);
    });
    for (let i = 0; i < state.numPlayers; ++i) {
      const childState = state.childStates[i];

      if (childState.chainNumber) {
        const childEffects = super.step(childState, []);
        hasStepped[i] = true;

        childEffects.forEach((effect) => {
          effect.player = i;
          effects.push(effect);
        });
        if (!childState.chainNumber) {
          if (childState.allClearBonus) {
            childState.chainScore += basic.maxNuisanceRows * childState.width * childState.targetScore;
            childState.allClearBonus = 0;
          }
          const nuisanceSent = basic.sendNuisance(childState);

          for (let j = 0; j < state.numPlayers; ++j) {
            if (i === j) {
              continue;
            }
            state.childStates[j].pendingNuisance += nuisanceSent;
          }
          nuisanceReceivers.push(childState);
        }
      }
    }
    for (let i = 0; i < state.numPlayers; ++i) {
      if (hasStepped[i]) {
        continue;
      }
      const childState = state.childStates[i];
      const childEffects = super.step(childState, eventsForPlayer[i]);

      childEffects.forEach((effect) => {
        effect.player = i;
        effects.push(effect);
      });
      if (!childState.chainNumber) {
        basic.receiveNuisance(childState);
      }
      ++childState.dealIndex;
      if (childState.dealIndex + state.numDeals >= state.deals.length) {
        const RNG = JKISS31.unserialize(state.RNG);

        state.deals.push(basic.randomDeal(RNG, state.numColors));
        state.RNG = RNG.serialize();
      }
    }
    nuisanceReceivers.forEach((childState) => {
      basic.receiveNuisance(childState);
    });

    state.childStates.forEach((childState) => {
      if (childState.blocks.every(block => block !== basic.emptyPuyo)) {
        gameOver = true;
        ++childState.gameOvers;
      }
    });
    if (gameOver) {
      state.childStates.forEach((childState) => {
        childState.blocks.fill(basic.emptyPuyo);
      });
    }

    return effects;
  }
}

function factory(name) {
  switch (name) {
    case 'puyo:endless':
      return new EndlessStepper();
    case 'puyo:duel':
      return new DuelStepper();
    default:
      return null;
  }
}

module.exports = factory;
