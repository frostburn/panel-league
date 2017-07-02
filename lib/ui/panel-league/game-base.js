import random from 'lodash/random';
import uuidV4 from 'uuid/v4';

import Game from '../game';
import KeyBindingMapping from './keybindings';


/**
 * Abstract base class for all Panel League games.
 */
export default class PanelLeagueGameBase extends Game {
  constructor() {
    super();

    this.el.classList.add('panel-league');

    this.engine = null;
    this.timer = null;
    this.waitTime = 0;
  }

  get isRunning() {
    return this.engine && this.timer;
  }

  get canMove() {
    return (this.isRunning && !this.spectating);
  }

  onMoveSwapperLeft() {
    if (this.canMove) {
      --this.playerGrid.swapper.x;
    }
  }

  onMoveSwapperRight() {
    if (this.canMove) {
      ++this.playerGrid.swapper.x;
    }
  }

  onMoveSwapperUp() {
    if (this.canMove) {
      --this.playerGrid.swapper.y;
    }
  }

  onMoveSwapperDown() {
    if (this.canMove) {
      ++this.playerGrid.swapper.y;
    }
  }

  onSwap({ x = null, y = null } = {}) {
    if (!this.canMove) {
      return;
    }
    if (x == null || y == null) {
      [x, y] = [this.playerGrid.swapper.x, this.playerGrid.swapper.y];
    }
    this.engine.addEvent({
      time: this.engine.time,
      type: 'swap',
      player: this.player,
      index: x + (y * this.playerGrid.width),
    });
  }

  onAddRow() {
    if (!this.canMove) {
      return;
    }
    this.engine.addEvent({
      time: this.engine.time,
      player: this.player,
      type: 'addRow',
    });
  }

  onRefill() {
    if (!this.canMove) {
      return;
    }
    this.engine.addEvent({
      time: this.engine.time,
      player: this.player,
      type: 'refill',
    });
  }

  onAddGarbage() {
    if (!this.canMove) {
      return;
    }
    const width = random(1, this.engine.width);
    const x = random(0, this.engine.width - width);
    const height = random(1, 3);
    const uuid = uuidV4();

    // UUID is injected for the UI only.
    this.engine.addEvent({
      time: this.engine.time,
      type: 'addGarbage',
      player: this.player,
      slab: { x, width, height, uuid }
    });
  }
}


PanelLeagueGameBase.prototype.keyBindings = KeyBindingMapping;
