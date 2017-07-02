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
  maxLosses: 2,
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
      dropScore: 0,
      leftoverScore: 0,
      chainNumber: 0,
      allClearBonus: false,
      chainAllClearBonus: false,
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
        state.chainAllClearBonus = true;
      }
    } else {
      state.chainNumber = 0;
    }
    ++state.time;
    return effects;
  }

  postProcess(state) {
    state.puyos = [];
    state.blocks.forEach((block, index) => {
      const neighbours = basic.neighbours(index, state.width, state.height + state.ghostHeight);
      const puyo = {
        classes: [],
      };

      state.puyos.push(puyo);
      if (!block) {
        return;
      }
      neighbours.forEach((neighbour) => {
        if (state.blocks[neighbour[0]] === block) {
          puyo.classes.push(`connect-${neighbour[1]}`);
        }
      });
    });
  }

  canStep(state, events) {
    if (state.chainNumber) {
      if (events.length) {
        throw new Error('Illegal moves detected');
      }
      return true;
    } else if (events.length) {
      return true;
    }
    return false;
  }

  canPlay(state, events) {
    return (!events.length && !state.chainNumber);
  }

  canAdd(state, events, args) {
    const { blocks } = args;
    const original = JSON.stringify(state.blocks);

    state.blocks.unshift(...blocks);
    basic.handleGravity(state);
    basic.removeExtraPuyos(state);

    return original !== JSON.stringify(state.blocks);
  }

  validateEvent(state, event) {
    if (event.type !== 'addPuyos') {
      return {
        valid: false,
        reason: `Unknown event ${event.type}`,
      };
    }
    const blocks = event.blocks;

    if (!basic.puyosMatchDeal(blocks, state.deals[0], state.width)) {
      return {
        valid: false,
        reason: 'Added puyos do not match the dealt piece',
      };
    }
    // TODO: Convert steppers into static as they never use `this`.
    // Can't let sub classes override this part.
    const stepper = new BasicStepper();

    if (!stepper.canAdd(state, [], { blocks })) {
      return {
        valid: false,
        reason: 'No room for the added puyos',
      };
    }
    return { valid: true };
  }
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
      state.dropScore = 0;
    }
    if (state.chainAllClearBonus) {
      state.totalScore += 8500;
      state.chainAllClearBonus = false;
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
    const maxLosses = defaultTo(options.maxLosses, defaultOptions.maxLosses);
    const initialRNG = new JKISS31();
    const parentState = {
      time: 0,
      numColors,
      numPlayers,
      numDeals,
      maxLosses,
      width,
      height,
      childStates: [],
      status: { terminated: false },
    };

    initialRNG.scramble();
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

  distributeEvents(state, events) {
    const eventsForPlayer = {};

    for (let i = 0; i < state.numPlayers; ++i) {
      eventsForPlayer[i] = [];
    }
    events.forEach((event) => {
      eventsForPlayer[event.player].push(event);
    });
    return eventsForPlayer;
  }

  step(state, events) {
    const effects = [];
    const hasStepped = {};
    const nuisanceReceivers = [];
    const eventsForPlayer = this.distributeEvents(state, events);
    const terminationEvent = (events.find(event => event.type === 'termination'));

    if (terminationEvent) {
      state.status = {
        terminated: true,
        loser: terminationEvent.player,
        result: terminationEvent.reason,
      };
    }

    if (state.status.terminated) {
      return [];
    }
    ++state.time;

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
          }
          childState.allClearBonus = childState.chainAllClearBonus;
          childState.chainAllClearBonus = false;
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
        nuisanceReceivers.push(childState);
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

    this.handleGameOvers(state, events);

    return effects;
  }

  handleGameOvers(state, events) {
    let gameOver = false;
    let terminated = false;
    let terminationReason;
    let terminatedPlayer;

    state.childStates.forEach((childState) => {
      if (childState.blocks.every(block => block !== basic.emptyPuyo)) {
        gameOver = true;
        ++childState.gameOvers;
        if (childState.gameOvers >= state.maxLosses) {
          terminated = true;
          terminationReason = `Player ${childState.player} lost`;
          terminatedPlayer = childState.player;
        }
      }
    });
    if (gameOver) {
      state.childStates.forEach((childState) => {
        childState.blocks.fill(basic.emptyPuyo);
        childState.pendingNuisance = 0;
        childState.leftoverScore = 0;
        childState.nuisanceX = 0;
        childState.chainNumber = 0;
        childState.chainScore = 0;
        childState.dropScore = 0;
        childState.allClearBonus = false;
        childState.chainClearBonus = false;
        childState.dealIndex = 0;
      });
      state.deals = state.deals.slice(-state.numDeals);
    }

    if (terminated) {
      if (state.childStates.every(child => child.gameOvers === state.childStates[0].gameOvers)) {
        terminatedPlayer = undefined;
        terminationReason = 'Draw';
      }
      state.status = {
        terminated,
        loser: terminatedPlayer,
        result: terminationReason,
      };
    }
  }

  canStep(state, events) {
    const eventsForPlayer = this.distributeEvents(state, events);

    return state.childStates.every(child => super.canStep(child, eventsForPlayer[child.player]));
  }

  canPlay(state, events, args) {
    const { player } = args;
    const eventsForPlayer = this.distributeEvents(state, events);

    return super.canPlay(state.childStates[player], eventsForPlayer[player]);
  }

  canAdd(state, events, args) {
    const { player } = args;

    return super.canAdd(state.childStates[player], [], args);
  }

  validateEvent(state, event) {
    if (state.status.terminated) {
      return {
        valid: false,
        reason: 'Game has been terminated',
      };
    }
    const childState = state.childStates[event.player];

    childState.deals = [basic.dealForPlayer(state, event.player)];
    return super.validateEvent(childState, event);
  }

  dealForPlayer(state, events, args) {
    if (!this.canPlay(state, events, args)) {
      return null;
    }
    return basic.dealForPlayer(state, args.player);
  }

  postProcess(state) {
    state.childStates.forEach(childState => super.postProcess(childState));

    state.childStates.forEach((childState, index) => {
      let offsettingScore = childState.chainScore + childState.leftoverScore;
      let incomingNuisance = childState.pendingNuisance;

      if (!childState.chainNumber) {
        offsettingScore -= childState.dropScore;
      }
      incomingNuisance -= Math.floor(offsettingScore / childState.targetScore);
      if (childState.chainNumber && childState.allClearBonus) {
        childState.incomingNuisance -= basic.maxNuisanceRows * childState.width;
      }
      state.childStates.forEach((other, otherIndex) => {
        let incomingScore = other.chainScore + other.leftoverScore;

        if (otherIndex === index || !other.chainNumber) {
          return;
        }
        if (other.allClearBonus) {
          incomingScore += basic.maxNuisanceRows * other.width * other.targetScore;
        }
        incomingNuisance += Math.floor(incomingScore / other.targetScore) - other.pendingNuisance;
      });
      childState.incomingNuisance = Math.max(0, incomingNuisance);
    });
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
