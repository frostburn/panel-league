import { el } from 'redom';

import Game from '../game';
import KeyBindingMapping from './keybindings';


/**
 * Abstract base class for all Puyo games.
 */
export default class PuyoGameBase extends Game {
  constructor(args) {
    super(args);

    this.el.classList.add('puyo');
    this.engine = null;
  }

  get isRunning() {
    return this.engine;
  }

  get canMove() {
    return (this.isRunning && !this.spectating);
  }

  onMovePieceLeft() {
    if (this.canMove) {
      --this.playerGrid.piece.x;
    }
  }

  onMovePieceRight() {
    if (this.canMove) {
      ++this.playerGrid.piece.x;
    }
  }

  onRotateClockwise() {
    if (this.canMove) {
      ++this.playerGrid.piece.rotation;
    }
  }

  onRotateCounterclockwise() {
    if (this.canMove) {
      --this.playerGrid.piece.rotation;
    }
  }

  onDrop() {
    if (!this.canMove) {
      return;
    }
    const blocks = this.playerGrid.piece.blocks;
    const player = this.player;
    const canAdd = this.engine.callStepper('canAdd', { player, blocks });
    let canPlay = this.engine.callStepper('canPlay', { player });

    if (canPlay && canAdd) {
      this.engine.addEvent({
        time: this.engine.time,
        type: 'addPuyos',
        player,
        blocks,
      });
      canPlay = this.engine.callStepper('canPlay', { player });
      this.playerGrid.updateWaiting(canPlay);
      this.playerGrid.piece.canPlay = canPlay;
    }
  }

  get footerEl() {
    if (this.noFooter) {
      return el('');
    }
    if (!this.footerElCache) {
      let text = 'Controls: ';
      text += 'arrow keys = move, ';
      text += 'f = rotate clockwise, ';
      text += 'd = counterclockwise, ';
      text += 'down = hard drop';
      this.footerElCache = el('footer', text);
    }
    return this.footerElCache;
  }
}

PuyoGameBase.prototype.keyBindings = KeyBindingMapping;
