/* eslint-env node */

const uuidV4 = require('uuid/v4');


class Player {
  constructor(server, socket) {
    this.id = uuidV4();
    this.server = server;
    this.socket = socket;
    this.game = null;
    socket.on('game event', (data) => {
      if (this.game) {
        this.game.addEvent(data, this);
      }
    });
    socket.on('disconnect', () => {
      this.server.removePlayer(this.id);
    });
  }
}

module.exports = Player;
