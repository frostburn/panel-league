/* eslint-env browser */

import { setChildren } from 'redom';

import Grid from './grid';
import PanelLeagueGameBase from './game-base';

import { NetworkGameEngine } from '../../common/engine';


export default class PanelLeagueGameSandbox extends PanelLeagueGameBase {
  constructor(args) {
    super(args);

    this.el.classList.add('panel-league-sandbox');

    this.playerGrid = null;
  }

  onmount() {
    super.onmount();
  }

  onEstablishConnection( {socket, player, game, frameRate }) {
    this.player = player;
    this.engine = NetworkGameEngine.unserialize(game);
    this.engine.installSocket(socket);
    this.frameRate = frameRate;

    this.playerGrid = new Grid({
      width: this.engine.width,
      height: this.engine.height,
      player: this.player,
      element: '.full-width',
    });
    setChildren(this.el, [this.playerGrid, this.footerEl]);
    this.installGameTimer();
    this.playerGrid.installEventListeners();

    this.engine.on('chainMatchMade', (effect) => {
      // Match indices are sorted and we take the one closest to the top.
      const chainingBlockIndex = effect.indices[0];

      this.playerGrid.blocks[chainingBlockIndex].addTooltip(`${effect.chainNumber}`);
    });

    this.engine.on('addRow', (effect) => {
      --this.playerGrid.swapper.y;
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
    this.playerGrid.update(this.engine.step());
  }
}
