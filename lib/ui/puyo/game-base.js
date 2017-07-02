import Game from '../game';
import KeyBindingMapping from './keybindings';


/**
 * Abstract base class for all Puyo games.
 */
export default class PuyoGameBase extends Game {
  constructor() {
    super();

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
}

PuyoGameBase.prototype.keyBindings = KeyBindingMapping;
