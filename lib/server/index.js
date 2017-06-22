/* eslint-env node */

const defaultTo = require('lodash/defaultTo');

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
          const game = this.games[id];

          if (game.shouldStep) {
            game.step();
          }
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

    this.players[player.id] = player;
    process.stdout.write(`Connection from ${socket.conn.remoteAddress}\n`);
  }

  getGames() {
    return Object.keys(this.games).map((id) => {
      const game = this.games[id];

      return {
        id,
        mode: game.mode,
        playerCount: game.playerCount,
        maximumPlayerCount: game.maximumPlayerCount,
      };
    });
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
