const { GameEngine } = require('./engine');


class Game {
  constructor(server) {
    this.server = server;
    this.players = [];
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

  addPlayer(player) {
    if (this.players.length > 1) {
      return;
    }
    player.game = this;
    this.players.push(player);
    if (this.players.length === 2) {
      process.stdout.write('Game is starting...\n');
      this.players.forEach((player, index) => {
        player.socket.emit('connected', {
          player: index,
          game: this.engine.serialize(),
          frameRate: this.server.frameRate,
        });
      });
    }
  }

  removePlayer(player) {
    const index = this.players.indexOf(player);

    if (index >= 0) {
      this.players.splice(index, 1);
      // TODO: Signal remaining players about the disconnected player.
      if (!this.players.length) {
        this.server.removeGame(this);
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
  }

  step() {
    this.engine.step();
    if (this.engine.time % 10 === 0) {
      this.players.forEach((player) => {
        player.socket.emit('clock', { time: this.engine.time });
      });
    }
  }
}

module.exports = Game;
