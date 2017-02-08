const defaultTo = require('lodash/defaultTo');

const { SandboxGame, VsGame } = require('./game');
const Player = require('./player');


const defaultOptions = {
  frameRate: 30,
};


class BaseGameServer {
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

  addConnection(player) {}

  removeGame(game) {
    const index = this.games.indexOf(game);

    if (game >= 0) {
      this.games.splice(index, 1);
      process.stdout.write('Game shutting down...\n');
    }
  }
}

class SandboxGameServer extends BaseGameServer {
  constructor(options = {}) {
    super(options);
    this.games.push(new SandboxGame(this));
    this.game = this.games[0];
  }

  addConnection(socket) {
    const player = new Player(socket);

    this.game.addPlayer(player);
  }
}

class VsGameServer extends BaseGameServer {
  addConnection(socket) {
    const player = new Player(socket);
    let game = this.games.find((game) => game.players.length < 2);

    process.stdout.write(`Connection from ${socket.conn.remoteAddress}\n`);
    if (!game) {
      game = new VsGame(this);
      this.games.push(game);
      process.stdout.write('New game is created\n');
    }
    game.addPlayer(player);
  }
}

module.exports = { SandboxGameServer, VsGameServer };
