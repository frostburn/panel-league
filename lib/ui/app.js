/* eslint-env browser */

import Cookie from 'js-cookie';
import { el, setChildren } from 'redom';

import gameFactory from './game-factory';
import Lobby from './lobby';

import { listen } from './dispatch';


export default class App {
  constructor() {
    this.socket = null;
    this.sessionId = Cookie.get('sessionId');

    this.el = el('', this.lobby = new Lobby());
  }

  get metadata() {
    return { name: this.lobby.nickInput.value };
  }

  onmount() {
    listen(this);
    this.installSocket();
  }

  onunmount() {
    this.uninstallSocket();
  }

  installSocket() {
    const socket = window.io();

    this.socket = socket;

    this.socket.on('client error', (data) => {
      window.alert(`Client side error:\n${data.message}`);
    });

    this.socket.on('connected', (data) => {
      if (!this.game) {
        throw new Error('Connected to an game without requesting to join/create it.');
      }
      this.game.onEstablishConnection(Object.assign({ socket: this.socket }, data));
    });

    this.socket.on('clock', (data) => {
      if (!this.game) {
        throw new Error('Received game event without being joined in a game.');
      }
      this.game.onClock(data);
    });

    this.socket.on('game list', (data) => {
      this.lobby.update(data.games);
    });

    this.socket.on('session event', data => this.handleSessionEvent(data));
    this.initSession();
  }

  uninstallSocket() {
    if (this.socket) {
      this.socket.close();
      delete this.socket;
    }
  }

  onRequestGameList() {
    if (this.socket) {
      this.socket.emit('game list');
    }
  }

  onCreateNewGame({ mode }) {
    if (this.socket) {
      const game = gameFactory(mode, this.socket);
      const metadata = this.metadata;

      this.socket.emit('game create', { mode, metadata });
      setChildren(this.el, [this.game = game]);
    }
  }

  onJoinGame({ id, mode }) {
    if (this.socket) {
      const game = gameFactory(mode, this.socket);
      const metadata = this.metadata;

      this.socket.emit('game join', { id, metadata });
      setChildren(this.el, [this.game = game]);
    }
  }

  onSpectateGame({ id, mode }) {
    if (this.socket) {
      const game = gameFactory(mode, this.socket);

      this.socket.emit('game spectate', { id });
      setChildren(this.el, [this.game = game]);
    }
  }

  onChangeNick({ name }) {
    if (this.socket) {
      this.socket.emit('session event', {
        sessionId: this.sessionId,
        type: 'nick',
        value: name,
      });
    }
  }

  handleSessionEvent(event) {
    if (event.type === 'nick') {
      this.lobby.updateNick(event.value || '');
    }
  }

  initSession() {
    this.socket.emit('session event', {
      sessionId: this.sessionId,
      type: 'nick',
    });
  }
}
