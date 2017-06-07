/* eslint-env browser */

import { el, setChildren } from 'redom';

import Grid from './grid';
import PanelLeagueGameBase from './game-base';

import { NetworkGameEngine } from '../../engine';


export default class PanelLeagueGameDuel extends PanelLeagueGameBase {
  constructor(socket) {
    super();

    this.el.classList.add('panel-league-duel');

    this.socket = socket;
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

    this.installSocketListeners();
    setChildren(this.el, [el('h1', 'Waiting for an opponent to join...')]);
  }

  onunmount() {
    this.uninstallGameTimer();
  }

  installSocketListeners() {
    this.socket.on('client error', data => {
      window.alert(`Client side error:\n${data.message}`);
    });

    this.socket.on('connected', data => {
      this.player = data.player;
      this.engine = NetworkGameEngine.unserialize(data.game);
      this.engine.installSocket(this.socket);
      this.frameRate = data.frameRate;

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
      this.playerGrid.installEventListeners();

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
    });

    this.socket.on('clock', data => {
      const serverTime = data.time;

      if (!this.isRunning) {
        return;
      }
      while (this.engine.time < serverTime) {
        this.step();
      }
      this.waitTime = this.engine.time - serverTime;
    });

    this.socket.on('game list', data => {
      const game = data.games.find(game => game.playerCount < game.maximumPlayerCount);

      if (game) {
        this.socket.emit('game join', { id: game.id });
      } else {
        this.socket.emit('game create', { mode: 'panel-league-duel' });
      }
    });

    this.socket.emit('game list');
  }

  installGameTimer() {
    this.timer = window.setInterval(() => {
      if (!this.isRunning) {
        this.uninstallGameTimer();
      } else if (this.waitTime-- <= 0) {
        this.step();
      }
    }, 1000 / this.frameRate);
  }

  uninstallGameTimer() {
    if (this.timer) {
      window.clearInterval(this.timer);
      delete this.timer;
    }
  }

  step() {
    const opponent = 1 - this.player;
    const states = this.engine.step().childStates;

    this.playerGrid.update(states[this.player]);
    this.opponentGrid.update(states[opponent]);
  }
}
