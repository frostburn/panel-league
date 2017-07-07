/* eslint-env browser */

import { setChildren } from 'redom';

import Grid from './grid';
import PuyoGameBase from './game-base';

import { NetworkGameEngine } from '../../common/engine';


export default class PuyoEndlessGame extends PuyoGameBase {
  constructor(socket) {
    super();

    this.el.classList.add('puyo-endless');

    this.socket = socket;
    this.playerGrid = null;
  }

  onEstablishConnection({ socket, game, spectating, metadata }) {
    this.engine = NetworkGameEngine.unserialize(game);
    this.engine.installSocket(socket);

    this.playerGrid = new Grid(this.engine.currentState, false, metadata.players[0].name);
    setChildren(this.el, this.playerGrid);
    if (spectating) {
      this.spectating = true;
    } else {
      this.playerGrid.installEventListeners();
    }
  }

  onClock({ time }) {
    if (!this.isRunning) {
      return;
    }
    while (this.engine.time < time) {
      this.step();
    }
  }

  step() {
    const state = this.engine.step();

    this.playerGrid.update(state);
    this.playerGrid.piece.canPlay = this.engine.callStepper('canPlay');
  }
}
