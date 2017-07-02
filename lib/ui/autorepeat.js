class KeyAutorepeater {
  constructor(repeatDelay, repeatRate) {
    this.repeatDelay = repeatDelay;
    this.repeatRate = repeatRate;
    this.listeners = new Map();
    this.repeaters = new Set();
    this.keyDownData = new Map();
    this.eventListeners = [];
    this.installKeydownEventListener();
    this.installKeyupEventListener();
  }

  uninstall() {
    this.eventListeners.forEach((listener) => {
      window.removeEventListener(...listener);
    });
    for (const data of this.keyDownData.values()) {
      window.clearTimeout(data.id);
    }
  }

  installKeydownEventListener() {
    const listener = ['keydown', (ev) => {
      let id;
      const key = ev.key;

      if (!this.listeners.has(key)) {
        return;
      }
      ev.preventDefault();
      if (this.keyDownData.has(key)) {
        return;
      }

      if (this.repeaters.has(key)) {
        id = window.setTimeout(() => this.autorepeat(key), this.repeatDelay);
      }
      this.keyDownData.set(key, {
        key,
        id,
      });
      this.listeners.get(key)();
    }];

    window.addEventListener(...listener);
    this.eventListeners.push(listener);
  }

  installKeyupEventListener() {
    const listener = ['keyup', (ev) => {
      const key = ev.key;
      const data = this.keyDownData.get(key);

      if (data) {
        window.clearTimeout(data.id);
        this.keyDownData.delete(key);
      }
    }];

    window.addEventListener(...listener);
    this.eventListeners.push(listener);
  }

  autorepeat(key) {
    const id = window.setTimeout(() => this.autorepeat(key), this.repeatRate);

    this.keyDownData.get(key).id = id;
    this.listeners.get(key)();
  }

  on(key, callback, doAutorepeat = true) {
    this.listeners.set(key, callback);
    if (doAutorepeat) {
      this.repeaters.add(key);
    }
  }
}

module.exports = KeyAutorepeater;
