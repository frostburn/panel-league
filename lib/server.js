const defaultTo = require('lodash/defaultTo');

const Game = require('./game');
const Player = require('./player');


const defaultOptions = {
  frameRate: 30,
};


class GameServer {
  constructor(options = {}) {
    this.frameRate = defaultTo(options.frameRate, defaultOptions.frameRate);
    this.games = {};
    this.players = {};
    this.mainLoop = null;
  }

  run() {
    if (this.mainLoop) {
      return;
    }
    this.mainLoop = setInterval(
      () => {
        Object.keys(this.games).forEach((id) => {
          this.games[id].step();
        });
      },
      1000 / this.frameRate
    );
  }

  stop() {
    if (!this.mainLoop) {
      return;
    }
    clearInterval(this.mainLoop);
    this.mainLoop = null;
    // TODO: Emit server shutting down to games that are still running.
  }

  addConnection(socket) {
    const player = new Player(this, socket);
    const availableGameID = Object.keys(this.games).find((id) => this.games[id].playerCount < 2);
    let game;

    this.players[player.id] = player;
    process.stdout.write(`Connection from ${socket.conn.remoteAddress}\n`);
    if (availableGameID) {
      game = this.games[availableGameID];
    } else {
      game = new Game(this);
      this.games[game.id] = game;
      process.stdout.write(`Game ${game.id} created\n`);
    }
    game.addPlayer(player);
  }

  removeGame(id) {
    const game = this.games[id];

    if (game) {
      delete this.games[id];
      process.stdout.write(`Game ${id} is shutting down...\n`);
    }
  }

  removePlayer(id) {
    const player = this.players[id];

    if (player) {
      delete this.players[id];
      process.stdout.write(`${player.socket.conn.remoteAddress} disconnected\n`);
      if (player.game) {
        player.game.removePlayer(id);
      }
    }
  }
}

module.exports = GameServer;
