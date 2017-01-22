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
const {blockTypes, newBlock} = require('./engine-util');
const basic = require('./engine-basic');
const garbage = require('./engine-garbage');
const defaultTo = require('lodash/defaultTo');

const STATE_CACHE_SIZE = 16;
const defaultOptions = {
  width: 6,
  height: 8,
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
  garbageFlashTime: 1,
  initialRows: 3,
  blockTypes: blockTypes,
};

class StandardStepper {
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
  initializeState(options) {
    const state = super.initializeState(options);
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
          state.score += 10 * effect.chainNumber;
          break;
        case 'matchMade':
          state.score += 9 * effect.chainNumber;
          break;
      }
    });
    return effects;
  }
}

class VsStepper extends StandardStepper {
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
    return [];
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
    if (effect.type == 'chainDone' && effect.chainNumber) {
      nextEvents.push({
        sender,
        receiver,
        type: 'addGarbage',
        slab: {
          x: 0,
          width: parentState.childStates[receiver].width,
          height: effect.chainNumber,
        }
      });
    }
  }

  postProcess(parentState) {
    parentState.childStates.forEach((childState) => {
      super.postProcess(childState);
    });
  }
}

const steppers = [StandardStepper, ScoringStepper, VsStepper];

class GameEngine {
  constructor(options = {}) {
    const stepperClass = defaultTo(options.stepper, StandardStepper);
    this.stepper = new stepperClass();
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const colors = options.colors;
    const state = this.stepper.initializeState(options);

    this.time = state.time;
    this.eventsByTime = {};
    this.initialState = JSON.stringify(state);

    // Smart state cache for handling input lag.
    this.statesByTime = new Map();
    this.lastValidTime = this.time;

    // Effect set for emmitting unique events to listeners.
    this.effects = new Set();
    this.listeners = [];

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
    state = JSON.parse(state);
    for (let instant = this.lastValidTime; instant < this.time; ++instant) {
      const events = this.eventsByTime[instant] || [];
      const effects = this.stepper.step(state, events);
      this.emitEffects(instant, effects);
      this.statesByTime.set(instant + 1, JSON.stringify(state));
    }
    this.lastValidTime = this.time;
    this.statesByTime.delete(this.lastValidTime - STATE_CACHE_SIZE);
    ++this.time;

    this.stepper.postProcess(state);
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

  addEvent(event) {
    const events = this.eventsByTime[event.time] || [];

    if (event.time <= this.lastValidTime - STATE_CACHE_SIZE) {
      this.invalidateCache();
    } else {
      this.lastValidTime = Math.min(this.lastValidTime, event.time);
    }
    events.push(event);
    this.eventsByTime[event.time] = events;
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

  serialize() {
    const attrs = Object.assign({}, this);
    delete attrs.statesByTime;
    delete attrs.stepper;
    delete attrs.effects;
    delete attrs.listeners;
    const data = {
      attrs,
      stepper: steppers.indexOf(this.stepper.constructor),
      cache: this.exportCache(),
    };
    return JSON.stringify(data);
  }

  static unserialize(data) {
    const game = new this();
    data = JSON.parse(data);
    Object.assign(game, data.attrs);
    game.stepper = new steppers[data.stepper]();
    game.importCache(data.cache);
    return game;
  }

  emitEffects(time, effects) {
    this.listeners.forEach((listener) => {
      listener.triggered = false;
    });
    effects.forEach((effect) => {
      effect.time = time;
      const effectJSON = JSON.stringify(effect);
      if (!this.effects.has(effectJSON)) {
        this.effects.add(effectJSON);
        this.emitEffect(effect);
      }
    });
  }

  on(type, callback, filtered=true) {
    this.listeners.push({type, callback, filtered});
  }

  emitEffect(effect) {
    const listener = this.listeners.find((listener) => listener.type === effect.type);
    if (listener) {
      if (listener.filtered && listener.triggered) {
        return;
      }
      listener.triggered = true;
      listener.callback(effect);
    }
  }
}

module.exports = {StandardStepper, ScoringStepper, VsStepper, GameEngine};
