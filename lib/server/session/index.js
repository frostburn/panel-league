/* eslint-env node */
const bluebird = require('bluebird');
const redis = require('redis');
const uuidV4 = require('uuid/v4');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

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

      client.hgetallAsync(hkey)
        .then(reply => reply || {})
        .then(session => handler(socket, session, data, client))
        .then(session => client.hmsetAsync(hkey, session))
        .then(() => client.quitAsync());
    });
  }

  onnick(socket, session, data) {
    if (data.value == null) {
      socket.emit('session event', {
        type: 'nick',
        value: session.nick,
      });
    } else {
      const name = data.value || '';

      session.nick = name.substring(0, 255);
    }
    return session;
  }

  onkeyBindings(socket, session, data) {
    const gameMode = data.gameMode;
    let bindings = session.keyBindings || '{}';

    bindings = JSON.parse(bindings);

    if (data.value == null) {
      if (gameMode != null) {
        bindings = bindings[gameMode];
      }
      socket.emit('session event', {
        type: 'keyBindings',
        value: bindings,
        gameMode,
      });
    } else {
      if (gameMode == null) {
        throw new Error('Must set key bindings individually per game mode');
      }
      bindings[gameMode] = data.value;
      session.keyBindings = JSON.stringify(bindings);
    }
    return session;
  }
}

module.exports = SessionHandler;
