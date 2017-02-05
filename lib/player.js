class Player {
  constructor(socket) {
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
        this.game.removePlayer(this);
      }
    });
  }
}

module.exports = Player;
