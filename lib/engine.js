const defaultTo = require('lodash/defaultTo');

const panelLeague = require('./panel-league/stepper');


const STATE_CACHE_SIZE = 16;

const defaultOptions = {
  width: 6,
  height: 8,
  stepper: 'panelLeagueStandard',
};


class GameEngine {
  constructor(options = {}) {
    const stepper = defaultTo(options.stepper, defaultOptions.stepper);
    this.stepper = panelLeague.factory(stepper);
    // Width and height are technically game specific but we cache them for convenience.
    const width = defaultTo(options.width, defaultOptions.width);
    const height = defaultTo(options.height, defaultOptions.height);
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
    game.stepper = panelLeague.factory(data.stepper);
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

  on(type, callback, filtered = true) {
    this.listeners.push({ type, callback, filtered });
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
    this.socket.emit('game event', { event });
  }

  addBroadcastEvent(event) {
    super.addEvent(event);
  }
}

// FIXME: Move NetworkGameEngine out of here as it's UI related, export only
// GameEngine instead properly.
module.exports = { GameEngine, NetworkGameEngine };
