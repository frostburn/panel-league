/* eslint-env browser */

import { el, setChildren } from 'redom';

import Grid from './grid';
import PanelLeagueGameBase from './game-base';

import { NetworkGameEngine } from '../../common/engine';


export default class PanelLeagueGameDuel extends PanelLeagueGameBase {
  constructor() {
    super();

    this.el.classList.add('panel-league-duel');

    this.playerGrid = null;
    this.opponentGrid = null;
  }

  /**
   * Returns grid component based on given player index.
   */
  getPlayerGrid(index) {
    return index === this.player ? this.playerGrid : this.opponentGrid;
  }

  onmount() {
    super.onmount();

    setChildren(this.el, [el('h1', 'Waiting for an opponent to join...')]);
  }

  onEstablishConnection({ socket, player, game, frameRate, spectating }) {
    this.player = spectating ? 0 : player;
    this.engine = NetworkGameEngine.unserialize(game);
    this.engine.installSocket(socket);
    this.frameRate = frameRate;

    // TODO: Initialize grids from engine.currentState
    this.playerGrid = new Grid({
      width: this.engine.width,
      height: this.engine.height,
      player: this.player,
    });
    this.opponentGrid = new Grid({
      width: this.engine.width,
      height: this.engine.height,
      player: 1 - this.player,
    });
    setChildren(this.el, [this.playerGrid, this.opponentGrid]);
    this.installGameTimer();
    if (spectating) {
      this.spectating = true;
    } else {
      this.playerGrid.installEventListeners();
    }

    this.engine.on('chainMatchMade', effect => {
      if (effect.player != null) {
        // Match indices are sorted and we take the one closest to the top.
        const chainingBlockIndex = effect.indices[0];

        this.getPlayerGrid(effect.player).blocks[chainingBlockIndex].addTooltip(`${effect.chainNumber}`);
      }
    });

    this.engine.on('addRow', effect => {
      if (effect.player != null) {
        --this.getPlayerGrid(effect.player).swapper.y;
      }
    }, false);
  }

  onClock({ time }) {
    if (!this.isRunning) {
      return;
    }
    while (this.engine.time < time) {
      this.step();
    }
    this.waitTime = this.engine.time - time;
  }

  installGameTimer() {
    this.installTimer(() => {
      if (this.waitTime-- <= 0) {
        this.step();
      }
    }, this.frameRate);
  }

  step() {
    const opponent = 1 - this.player;
    const states = this.engine.step().childStates;

    this.playerGrid.update(states[this.player]);
    this.opponentGrid.update(states[opponent]);
  }
}
