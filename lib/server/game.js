/* eslint-env node */

const noop = require('lodash/noop');
const uuidV4 = require('uuid/v4');

const { GameEngine } = require('../common/engine');


class Game {
  constructor(server, gameMode) {
    this.id = uuidV4();
    this.server = server;
    this.players = new Map();
    this.spectators = [];
    this.gameMode = gameMode;
    this.engine = new GameEngine(gameMode.engineOptions);
    this.timeControl = { export: noop, makeMove: noop, step: noop, addSocket: noop };
  }

  get mode() {
    return this.gameMode.name;
  }

  get playerCount() {
    return this.players.size;
  }

  get maximumPlayerCount() {
    return this.gameMode.maximumPlayerCount;
  }

  get metadata() {
    const players = Array.from(this.players.values(), player => player.metadata);

    return {
      mode: this.gameMode,
      players,
    };
  }

  get gameData() {
    return {
      game: this.engine.serialize(),
      timeControl: this.timeControl.export(),
      frameRate: this.gameMode.frameRate,
      metadata: this.metadata,
    };
  }

  addPlayer(player) {
    if (this.playerCount >= this.gameMode.maximumPlayerCount) {
      return;
    }
    player.game = this;
    this.players.set(player.id, player);
    if (this.gameMode.shouldStartGame(this)) {
      if (!this.timer) {
        process.stdout.write(`Game ${this.id} is starting...\n`);
        this.timer = setInterval(() => this.step(), 1000 / this.gameMode.frameRate);
        this.installTimeControl();
      }
      let index = -1;
      this.players.forEach((gamePlayer) => {
        index += 1;
        if (gamePlayer.connected) {
          return;
        }
        const gameData = this.gameData;

        gamePlayer.connected = true;
        gamePlayer.index = index;
        gameData.player = index;
        gamePlayer.socket.emit('connected', gameData);
        this.timeControl.addSocket(gamePlayer.socket);
      });
    }
  }

  addSpectator(player) {
    player.game = this;
    this.spectators.push(player);
    const gameData = this.gameData;

    gameData.spectating = true;
    player.socket.emit('connected', gameData);
    this.timeControl.addSocket(player.socket);
  }

  removePlayer(id) {
    const player = this.players.get(id);

    if (player) {
      this.players.delete(id);
      // Soft kill. Does a round trip through the browser.
      if (this.gameMode.shouldTerminateGame(this)) {
        this.addEvent({
          event: {
            time: this.engine.time,
            type: 'termination',
            player: player.index,
            reason: `Player ${player.index} quit`,
          },
        }, player);
      }
      // Hard kill. Stops all server side processing.
      if (this.gameMode.shouldStopGame(this)) {
        clearInterval(this.timer);
        clearInterval(this.timeControlTimer);
        delete this.timer;
        this.server.removeGame(this.id);
      }
    }
  }

  addEvent(data, source) {
    this.engine.addEvent(data.event);
    this.players.forEach((player) => {
      if (player !== source) {
        player.socket.emit('game event', data);
      }
    });
    this.spectators.forEach((player) => {
      player.socket.emit('game event', data);
    });
    this.timeControl.makeMove(data.event);
  }

  step() {
    if (!this.gameMode.shouldStep(this)) {
      return;
    }
    this.engine.step();
    if (this.gameMode.shouldSendClock(this)) {
      this.players.forEach((player) => {
        player.socket.emit('clock', { time: this.engine.time });
      });
      this.spectators.forEach((player) => {
        player.socket.emit('clock', { time: this.engine.time });
      });
    }
    if (this.gameMode.shouldRebase(this)) {
      if (this.rebaseState) {
        this.engine.rebase(this.rebaseState);
      }
      this.rebaseState = this.engine.lastValidState;
    }
    this.timeControl.step(this.engine);
  }

  installTimeControl() {
    if (!this.gameMode.timeControlClass) {
      return;
    }
    this.timeControl = new this.gameMode.timeControlClass();
    this.timeControlTimer = setInterval(() => this.timeControl.tick(), 1000);
    this.timeControl.on('gameOver', (losers) => {
      let loser;
      if (losers.length === 1) {
        loser = losers[0];
      }
      this.addEvent({
        event: {
          time: this.engine.time,
          type: 'termination',
          player: loser,
          reason: 'Timeout',
        },
      });
    });
  }
}

module.exports = Game;
