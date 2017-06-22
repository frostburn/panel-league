const uuidV4 = require('uuid/v4');

class SocketAdapter {
  constructor(uuid) {
    this.uuid = uuid;
    this.conn = {
      remoteAddress: `socket-adapter: ${this.uuid}`,
    };
    this.pair = null;
    this.callbacks = {};
  }

  trigger(name, data) {
    this.callbacks[name](data);
  }

  emit(name, data) {
    if (!this.pair) {
      throw new Error('Trying to emit on an unpaired socket adapter');
    }
    this.pair.trigger(name, data);
  }

  on(name, callback) {
    this.callbacks[name] = callback;
  }
}

function createAdapterPair() {
  const adapter1 = new SocketAdapter(uuidV4());
  const adapter2 = new SocketAdapter(uuidV4());

  adapter1.pair = adapter2;
  adapter2.pair = adapter1;

  return [adapter1, adapter2];
}

module.exports = createAdapterPair;
