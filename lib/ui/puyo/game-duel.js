/* eslint-env browser */

import { el, mount, setChildren } from 'redom';

import Grid from './grid';
import PuyoGameBase from './game-base';

import { NetworkGameEngine } from '../../common/engine';
import timeControlFactory from '../../common/timecontrol/factory';

export default class PuyoDuelGame extends PuyoGameBase {
  constructor(args) {
    super(args);

    this.el.classList.add('puyo-duel');

    this.playerGrid = null;
    this.opponentGrid = null;
    this.opponentSideGrid = null;
  }

  onmount() {
    super.onmount();
    setChildren(this.el, el('h1', 'Waiting for an opponent to join...'));
  }

  onEstablishConnection({ socket, player, game, timeControl, spectating, metadata }) {
    this.player = spectating ? 0 : player;
    this.engine = NetworkGameEngine.unserialize(game);
    this.engine.installSocket(socket);
    const parentState = this.engine.currentState;
    const opponent = 1 - this.player;
    let state = parentState.childStates[this.player];

    state.deals = parentState.deals.slice(state.dealIndex, state.dealIndex + parentState.numDeals);
    this.playerGrid = new Grid(state, spectating, metadata.players[this.player].name, '.duel');
    state = parentState.childStates[opponent];
    state.deals = parentState.deals.slice(state.dealIndex, state.dealIndex + parentState.numDeals);
    this.opponentGrid = new Grid(state, true, metadata.players[opponent].name, '.opponent-grid');
    this.opponentSideGrid = new Grid(state, true, metadata.players[opponent].name, '.duel wide-view');
    mount(this.playerGrid.el, this.opponentGrid);
    setChildren(this.el, [this.playerGrid, this.opponentSideGrid]);
    if (spectating) {
      this.spectating = true;
    } else {
      this.playerGrid.installEventListeners();
    }

    this.installTimer(() => {
      let canPlay = this.engine.callStepper('canPlay', { player: opponent });

      this.opponentGrid.updateWaiting(canPlay);
      this.opponentSideGrid.updateWaiting(canPlay);
      if (this.spectating) {
        canPlay = this.engine.callStepper('canPlay', { player: this.player });
        this.playerGrid.updateWaiting(canPlay);
      }
    }, 2);

    const onTick = () => {
      this.playerGrid.updateTimeControl(this.timeControl.players[this.player]);
      this.opponentGrid.updateTimeControl(this.timeControl.players[opponent]);
      this.opponentSideGrid.updateTimeControl(this.timeControl.players[opponent]);
    };

    this.timeControl = timeControlFactory(timeControl);
    this.timeControl.addSocket(socket);
    this.timeControl.on('tick', onTick);
    onTick();
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
    this.opponentSideGrid.update(states[opponent]);
    this.playerGrid.updateWaiting(canPlay);
    this.playerGrid.piece.canPlay = canPlay;
  }
}
