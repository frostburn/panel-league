/* eslint-env node */

const defaultTo = require('lodash/defaultTo');

const Player = require('./player');

class GameServer {
  constructor(options = {}) {
    this.games = {};
    this.players = {};
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
        metadata: game.metadata,
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
