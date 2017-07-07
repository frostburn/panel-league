/* eslint-env node */
const redis = require('redis');

const PREFIX = 'user:';

class SessionHandler {
  constructor(redisOptions, useInMemory) {
    this.redisOptions = redisOptions;
    this.useInMemory = useInMemory;
    this.fallbackDB = {};
  }

  addConnection(socket) {
    socket.on('session event', (data) => {
      const { type, sessionId } = data;
      const handler = this[`on${type}`];

      if (sessionId == null) {
        return;
      }
      if (this.useInMemory) {
        const session = this.fallbackDB[sessionId] || {};

        handler(socket, session, data);
        this.fallbackDB[sessionId] = session;
        return;
      }

      const client = redis.createClient(this.redisOptions);
      const hkey = `${PREFIX}${sessionId}`;

      client.hgetall(hkey, (err, reply) => {
        const session = reply || {};

        handler(socket, session, data);
        client.hmset(hkey, session, () => client.quit());
      });
    });
  }

  onnick(socket, session, data) {
    if (data.value != null) {
      const name = data.value || '';

      session.nick = name.substring(0, 255);
    } else {
      socket.emit('session event', {
        type: 'nick',
        value: session.nick,
      });
    }
  }
}

module.exports = SessionHandler;
