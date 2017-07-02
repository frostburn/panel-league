/* eslint-env browser */

import { el, setChildren } from 'redom';

import Grid from './grid';
import PuyoGameBase from './game-base';

import { NetworkGameEngine } from '../../common/engine';

export default class PuyoDuelGame extends PuyoGameBase {
  constructor() {
    super();

    this.el.classList.add('puyo-duel');

    this.playerGrid = null;
    this.opponentGrid = null;
  }

  onmount() {
    super.onmount();
    setChildren(this.el, el('h1', 'Waiting for an opponent to join...'));
  }

  onEstablishConnection({ socket, player, game, spectating }) {
    this.player = spectating ? 0 : player;
    this.engine = NetworkGameEngine.unserialize(game);
    this.engine.installSocket(socket);
    const parentState = this.engine.currentState;
    let state = parentState.childStates[this.player];

    state.deals = parentState.deals.slice(state.dealIndex, state.dealIndex + parentState.numDeals);
    this.playerGrid = new Grid(state, spectating);
    state = parentState.childStates[1 - this.player];
    state.deals = parentState.deals.slice(state.dealIndex, state.dealIndex + parentState.numDeals);
    this.opponentGrid = new Grid(state, true);
    setChildren(this.el, [this.playerGrid, this.opponentGrid]);
    if (spectating) {
      this.spectating = true;
    } else {
      this.playerGrid.installEventListeners();
    }

    window.setInterval(() => {
      const opponent = 1 - this.player;
      let canPlay = this.engine.callStepper('canPlay', { player: opponent });

      this.opponentGrid.updateWaiting(canPlay);
      if (this.spectating) {
        canPlay = this.engine.callStepper('canPlay', { player: this.player });
        this.playerGrid.updateWaiting(canPlay);
      }
    }, 500);
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
    const opponent = 1 - this.player;
    const parentState = this.engine.step();
    const states = parentState.childStates;
    const canPlay = this.engine.callStepper('canPlay', { player: this.player });

    if (parentState.status.terminated) {
      let result = parentState.status.result;

      if (parentState.status.loser != null) {
        if (this.spectating) {
          result = `Player ${2 - parentState.status.loser} won`;
        } else {
          result = `You ${parentState.status.loser === this.player ? 'lost' : 'won'}`;
        }
      }
      this.engine.socket.emit('terminate');
      setChildren(this.el, el('h1', result));
    }

    states.forEach((state) => {
      state.deals = parentState.deals.slice(
        state.dealIndex, state.dealIndex + parentState.numDeals
      );
    });
    this.playerGrid.update(states[this.player]);
    this.opponentGrid.update(states[opponent]);
    this.playerGrid.updateWaiting(canPlay);
    this.playerGrid.piece.canPlay = canPlay;
  }
}