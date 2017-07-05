const BaseTimeControl = require('./base');

class AbsoluteTimeControl extends BaseTimeControl {
  constructor({ numPlayers, maxTime }) {
    super({ numPlayers });
    this.maxTime = maxTime;
    this.players.forEach((player) => {
      player.timeRemaining = this.maxTime;
      player.waiting = true;
    });
    this.losers = [];
  }

  doMakeMove(index) {
    this.players[index].timeRemaining = this.maxTime;
    this.players[index].waiting = false;

    if (this.players.every(player => !player.waiting)) {
      this.players.forEach((player) => {
        player.waiting = true;
      });
    }
    super.doMakeMove(index);
  }

  doTick() {
    if (this.losers.length) {
      return;
    }
    this.players.forEach((player) => {
      if (!player.waiting) {
        return;
      }
      player.timeRemaining -= 1;
      if (player.timeRemaining < 0) {
        player.timeRemaining = 0;
        this.losers.push(player.index);
      }
    });
    if (this.losers.length && this.listeners.gameOver) {
      this.listeners.gameOver.forEach(callback => callback(this.losers));
    }
    super.doTick();
  }

  export() {
    const data = super.export();

    data.type = 'absolute';
    data.maxTime = this.maxTime;
    return data;
  }
}

module.exports = AbsoluteTimeControl;
