/* eslint-env node */

class SessionHandler {
  constructor() {
    this.sockets = [];
    this.db = {};
  }

  addConnection(socket) {
    this.sockets.push(socket);
    socket.on('session event', (data) => {
      const { type, sessionId } = data;
      const session = this.db[sessionId] || {};
      const handler = this[`on${type}`];

      if (sessionId == null) {
        return;
      }
      handler(socket, session, data);
      this.db[sessionId] = session;
    });
  }

  onnick(socket, session, data) {
    if (data.value != null) {
      session.nick = data.value;
    } else {
      socket.emit('session event', {
        type: 'nick',
        value: session.nick,
      });
    }
  }
}

module.exports = SessionHandler;
