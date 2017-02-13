/* eslint-env node */

const uuidV4 = require('uuid/v4');

const { GameEngine } = require('./engine');


class Game {
  constructor(server) {
    this.id = uuidV4();
    this.server = server;
    this.players = {};
    this.engine = new GameEngine({
      stepper: 'panelLeagueVs',
      width: 6,
      height: 12,
      flashTime: 40,
      floatTime: 10,
      swapTime: 3,
      garbageFlashTime: 2,
      blockTypes: [
        'red',
        'green',
        'blue',
        'yellow',
        'violet',
        'navy',
      ],
    });
  }

  get mode() {
    return 'vs';
  }

  get playerCount() {
    return Object.keys(this.players).length;
  }

  get maximumPlayerCount() {
    return 2;
  }

  addPlayer(player) {
    if (this.playerCount > 1) {
      return;
    }
    player.game = this;
    this.players[player.id] = player;
    if (this.playerCount === this.maximumPlayerCount) {
      process.stdout.write(`Game ${this.id} is starting...\n`);
      Object.keys(this.players).forEach((id, index) => {
        this.players[id].socket.emit('connected', {
          player: index,
          game: this.engine.serialize(),
          frameRate: this.server.frameRate,
        });
      });
    }
  }

  removePlayer(id) {
    const player = this.players[id];

    if (player) {
      delete this.players[id];
      // TODO: Signal remaining players about the disconnected player.
      if (!this.playerCount) {
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
  }

  step() {
    this.engine.step();
    if (this.engine.time % 10 === 0) {
      Object.keys(this.players).forEach((id) => {
        this.players[id].socket.emit('clock', { time: this.engine.time });
      });
    }
  }
}

module.exports = Game;
