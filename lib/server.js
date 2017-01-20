const defaultTo = require('lodash/defaultTo');

const Game = require('./game');
const Player = require('./player');


const defaultOptions = {
  frameRate: 30,
};


class GameServer {
  constructor(options = {}) {
    this.frameRate = defaultTo(options.frameRate, defaultOptions.frameRate);
    this.games = [];
    this.mainLoop = null;
  }

  run() {
    if (this.mainLoop) {
      return;
    }
    this.mainLoop = setInterval(
      () => {
        this.games.forEach((game) => {
          game.step();
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
    const player = new Player(socket);
    let game = this.games.find((game) => game.players.length < 2);

    process.stdout.write(`Connection from ${socket.conn.remoteAddress}\n`);
    if (!game) {
      game = new Game(this);
      this.games.push(game);
      process.stdout.write('New game is created\n');
    }
    game.addPlayer(player);
  }

  removeGame(game) {
    const index = this.games.indexOf(game);

    if (game >= 0) {
      this.games.splice(index, 1);
      process.stdout.write('Game shutting down...');
    }
  }
}

module.exports = GameServer;
