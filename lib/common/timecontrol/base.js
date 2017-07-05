class BaseTimeControl {
  constructor({ numPlayers }) {
    this.players = [];
    this.listeners = {};
    this.sockets = [];

    for (let index = 0; index < numPlayers; index += 1) {
      this.players.push({ index });
    }
  }

  addSocket(socket) {
    this.sockets.push(socket);
    socket.on('time control', (data) => {
      if (data.tick) {
        this.doTick();
      } else if (data.makeMove != null) {
        this.doMakeMove(data.makeMove);
      }
    });
  }

  makeMove(index) {
    this.doMakeMove(index);
    this.sockets.forEach(socket => socket.emit('time control', { makeMove: index }));
  }

  doMakeMove(index) {
    if (!this.listeners.makeMove) {
      return;
    }
    this.listeners.makeMove.forEach(callback => callback(index));
  }

  tick() {
    this.doTick();
    this.sockets.forEach(socket => socket.emit('time control', { tick: true }));
  }

  doTick() {
    if (!this.listeners.tick) {
      return;
    }
    this.listeners.tick.forEach(callback => callback());
  }

  on(name, callback) {
    const listeners = this.listeners[name] || [];

    listeners.push(callback);
    this.listeners[name] = listeners;
  }

  export() {
    const players = [];

    this.players.forEach(player => players.push(Object.assign({}, player)));
    return {
      numPlayers: this.players.length,
      players,
    };
  }
}

module.exports = BaseTimeControl;
