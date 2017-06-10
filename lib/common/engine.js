const panelLeagueFactory = require('./panel-league/stepper.js');
const puyoFactory = require('./puyo/stepper.js');
const defaultTo = require('lodash/defaultTo');

const STATE_CACHE_SIZE = 128;

const defaultOptions = {
  width: 6,
  height: 8,
  stepper: "panelLeagueStandard",
  stateCacheSize: STATE_CACHE_SIZE,
};

function factory(name) {
  let stepper = panelLeagueFactory(name);
  if (!stepper) {
    stepper = puyoFactory(name);
  }
  return stepper;
}

class GameEngine {
  constructor(options = {}) {
    const stepper = defaultTo(options.stepper, defaultOptions.stepper);
    this.stepper = factory(stepper);
    this.stateCacheSize = defaultTo(options.stateCacheSize, defaultOptions.stateCacheSize);
    // Width and height are technically game specific but we cache them for convenience.
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
    const colors = options.colors;
    const state = this.stepper.initializeState(options);

    this._time = state.time;
    this.eventsByTime = {};
    this.initialStateJSON = JSON.stringify(state);

    // Smart state cache for handling input lag.
    this.statesByTime = new Map();
    this.lastValidTime = null;

    // Effect set for emmitting unique events to listeners.
    this.effects = new Set();
    this.listeners = [];

    Object.defineProperty(this, 'width', { get: () => width });
    Object.defineProperty(this, 'height', { get: () => height });
  }

  get initialState() {
    return JSON.parse(this.initialStateJSON);
  }

  step() {
    let state;

    if (this.lastValidTime === null) {
      const stateJSON = this.initialStateJSON;

      state = JSON.parse(stateJSON);
      this.statesByTime.set(state.time, stateJSON);
      this.lastValidTime = state.time;
    } else {
      const stateJSON = this.statesByTime.get(this.lastValidTime);

      if (!stateJSON) {
        throw new Error('Unexpected cache miss');
      }
      state = JSON.parse(stateJSON);
    }
    if (!state) {
      throw new Error('State cache corrupted');
    }
    ++this._time;
    for (let instant = this.lastValidTime; instant < this._time; ++instant) {
      const events = this.eventsByTime[instant] || [];
      const effects = this.stepper.step(state, events);
      this.emitEffects(instant, effects);
      this.statesByTime.set(instant + 1, JSON.stringify(state));
    }
    this.lastValidTime = this._time;
    this.statesByTime.delete(this.lastValidTime - this.stateCacheSize);

    this.stepper.postProcess(state);
    return state;
  }

  invalidateCache() {
    this.lastValidTime = null;
    this.statesByTime = new Map();
  }

  get lastValidState() {
    if (this.lastValidTime === null) {
      return this.initialStateJSON;
    }
    return this.statesByTime.get(this.lastValidTime);
  }

  rebase(earlierState) {
    const state = JSON.parse(earlierState);
    const pastTimes = [];

    if (state.time > this._time) {
      throw new Error('Cannot rebase into the future');
    }
    this.initialStateJSON = earlierState;
    for (let instant in this.eventsByTime) {
      instant = parseInt(instant);
      if (instant < state.time) {
        pastTimes.push(instant);
      }
    }
    pastTimes.forEach((instant) => delete this.eventsByTime[instant]);
  }

  get time() {
    return this._time;
  }

  set time(value) {
    const state = this.statesByTime.get(value);

    if (!state) {
      this.invalidateCache();
    } else {
      this.lastValidTime = value;
    }
    this._time = value;
  }

  addEvent(event) {
    const events = this.eventsByTime[event.time] || [];

    events.push(event);
    this.eventsByTime[event.time] = events;
    if (this.lastValidTime === null) {
      return;
    }
    this.lastValidTime = Math.min(this.lastValidTime, event.time);
    if (!this.statesByTime.has(this.lastValidTime)) {
      this.invalidateCache();
    }
  }

  exportState() {
    const dump = JSON.stringify({
      state: this.initialStateJSON,
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
    this.initialStateJSON = imported.state;
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
    if (!data.time) {
      return;
    }
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
      width: this.width,
      height: this.height,
      stepper: this.stepper.name,
      cache: this.exportCache(),
    };
    return JSON.stringify(data);
  }

  static unserialize(data) {
    data = JSON.parse(data);
    const game = new this({
      width: data.width,
      height: data.height,
    });
    Object.assign(game, data.attrs);
    game.stepper = factory(data.stepper);
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
    const listeners = this.listeners.filter((listener) => listener.type === effect.type);
    listeners.forEach((listener) => {
      if (listener.filtered && listener.triggered) {
        return;
      }
      listener.triggered = true;
      listener.callback(effect);
    });
  }
}

class NetworkGameEngine extends GameEngine {
  installSocket(socket) {
    this.socket = socket;
    this.socket.on('game event', (data) => {
      this.addBroadcastEvent(data.event);
    });
  }

  addEvent(event) {
    super.addEvent(event);
    this.socket.emit('game event', {'event': event});
  }

  addBroadcastEvent(event) {
    super.addEvent(event);
  }
};

module.exports = {GameEngine, NetworkGameEngine};
