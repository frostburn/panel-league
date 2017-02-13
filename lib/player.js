/* eslint-env node */

const uuidV4 = require('uuid/v4');


class Player {
  constructor(socket) {
    this.id = uuidV4();
    this.socket = socket;
    this.game = null;
    socket.on('game event', (data) => {
      if (this.game) {
        this.game.addEvent(data, this);
      }
    });
    socket.on('disconnect', () => {
      process.stdout.write(`${this.socket.conn.remoteAddress} disconnected\n`);
      if (this.game) {
        this.game.removePlayer(this.id);
      }
    });
  }
}

module.exports = Player;
