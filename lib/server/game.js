/* eslint-env node */

const uuidV4 = require('uuid/v4');

const { GameEngine } = require('../common/engine');


class Game {
  constructor(server, gameMode) {
    this.id = uuidV4();
    this.server = server;
    this.players = {};
    this.spectators = [];
    this.gameMode = gameMode;
    this.engine = new GameEngine(gameMode.engineOptions);
  }

  get mode() {
    return this.gameMode.name;
  }

  get playerCount() {
    return Object.keys(this.players).length;
  }

  get maximumPlayerCount() {
    return this.gameMode.maximumPlayerCount;
  }

  addPlayer(player) {
    if (this.playerCount >= this.gameMode.maximumPlayerCount) {
      return;
    }
    player.game = this;
    this.players[player.id] = player;
    if (this.gameMode.shouldStartGame(this)) {
      process.stdout.write(`Game ${this.id} is starting...\n`);
      Object.keys(this.players).forEach((id, index) => {
        const gamePlayer = this.players[id];

        if (gamePlayer.connected) {
          return;
        }
        gamePlayer.connected = true;
        gamePlayer.socket.emit('connected', {
          player: index,
          game: this.engine.serialize(),
          frameRate: this.server.frameRate,
        });
      });
    }
  }

  addSpectator(player) {
    player.game = this;
    this.spectators.push(player);
    player.socket.emit('connected', {
      spectating: true,
      game: this.engine.serialize(),
      frameRate: this.server.frameRate,
    });
  }

  removePlayer(id) {
    const player = this.players[id];

    if (player) {
      delete this.players[id];
      // TODO: Signal remaining players about the disconnected player.
      if (this.gameMode.shouldStopGame(this)) {
        this.server.removeGame(this.id);
      }
    }
  }

  addEvent(data, source) {
    this.engine.addEvent(data.event);
    Object.keys(this.players).forEach((id) => {
      const player = this.players[id];

      if (player !== source) {
        player.socket.emit('game event', data);
      }
    });
    this.spectators.forEach((player) => {
      player.socket.emit('game event', data);
    });
  }

  get shouldStep() {
    return this.gameMode.shouldStep(this);
  }

  step() {
    this.engine.step();
    if (this.gameMode.shouldSendClock(this)) {
      Object.keys(this.players).forEach((id) => {
        this.players[id].socket.emit('clock', { time: this.engine.time });
      });
      this.spectators.forEach((player) => {
        player.socket.emit('clock', { time: this.engine.time });
      });
    }
  }
}

module.exports = Game;
