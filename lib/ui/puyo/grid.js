/* eslint-env browser */
import { el, mount, setStyle } from 'redom';

import Piece from './piece';
import Block from './block';
import DealPreview from './deal-preview';
import { touchmove, touchend } from './touch-events';

import { dispatch } from '../dispatch';

export default class Grid {
  constructor(state, hidePreviewGhosts, name, elDef) {
    const {
      width, height, ghostHeight,
      player, deals, dealIndex, numDeals
    } = state;

    this.width = width;
    this.height = height;
    this.ghostHeight = ghostHeight;
    this.player = player;
    this.hidePreviewGhosts = hidePreviewGhosts;

    this.previousState = state;
    this.displayState = {
      incomingNuisance: 0,
      totalScore: 0,
      gameOvers: 0,
      allClearBonus: false,
    };
    this.el = el(elDef,
      this.incomingDisplay = el('span.incoming.display', 'Incoming 0'),
      el('.grid-and-piece',
        this.piece = new Piece({ grid: this, x: 2, rotation: 0, deal: deals[dealIndex] }),
        this.grid = el('.grid'),
      ),
      el('span.name.display', name),
      this.dealPreview = new DealPreview({ deals: deals.slice(dealIndex, dealIndex + numDeals) }),
      this.waitingDisplay = el('span.waiting.display.slow-fade-out.flashing', 'Waiting...'),
      el('.time.display', el('span', 'Time '), this.timeControlDisplay = el('span', '∞')),
      el('.score.display',
        el('', 'Score'),
        el('',
          this.scoreDisplay = el('span', '0'),
          this.clearDisplay = el('span'),
        ),
      ),
      this.gameOversDisplay = el('span.game-over.display', 'Game overs 0'),
    );

    // Construct block rows and mount them.
    this.blocks = [];
    for (let y = 0; y < this.height + this.ghostHeight; ++y) {
      this[y] = {};
      for (let x = 0; x < this.width; ++x) {
        const block = new Block({ x, y });

        mount(this.grid, block);
        this.blocks.push(block);
        this[y][x] = block;
      }
    }
    this.update(state);

    // Fades the waiting display in.
    window.setTimeout(() => this.updateWaiting(true), 15);
  }

  installEventListeners() {
    this.piece.installEventListeners();
    this.blocks.forEach((block) => {
      block.el.addEventListener('mouseenter', (ev) => {
        ev.preventDefault();
        this.piece.x = block.x;
      });
      block.el.addEventListener('click', (ev) => {
        ev.preventDefault();
        // Right clicks are not likely to propagate here, but hey.
        if (ev.which === 3) {
          this.piece.rotation += 1;
          this.piece.x = block.x;
          return;
        }
        this.piece.x = block.x;
        dispatch(this, 'Drop');
      });
      block.el.addEventListener('touchstart', (ev) => {
        ev.preventDefault();  // Prevents the emulated mouse event
        this.piece.x = block.x;
      });

      // Right click hacks
      block.el.classList.add('piece-manipulator');
      block.el.classList.add('release');
      block.el.dataset.x = block.x;
      block.el.dataset.y = block.y;

      // Touch semi-hacks
      block.el.addEventListener('touchmove', ev => touchmove.bind(this.piece)(ev));
      block.el.addEventListener('touchend', ev => touchend.bind(this.piece)(ev));
    });
    // Right click hacks continued
    window.oncontextmenu = (ev) => {
      if (ev.which === 3) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);

        if (el && el.classList.contains('piece-manipulator')) {
          ev.preventDefault();
          this.piece.rotation += 1;
          this.piece.x = el.dataset.x;
        }
      }
    };
  }

  updateWaiting(canPlay) {
    if (canPlay) {
      this.waitingDisplay.classList.remove('slow-fade-out');
      this.waitingDisplay.classList.add('slow-fade-in');
    } else {
      this.waitingDisplay.classList.remove('slow-fade-in');
      this.waitingDisplay.classList.add('slow-fade-out');
    }
  }

  updateTimeControl(player) {
    this.timeControlDisplay.innerText = `${player.timeRemaining}`;
  }

  update(state) {
    const fullUpdate = !!state;

    if (!state) {
      state = this.previousState;
    }
    this.previousState = state;
    const {
      blocks, totalScore, gameOvers, deals,
      incomingNuisance, allClearBonus, dealIndex, numDeals
    } = state;

    this.piece.update({ deal: deals[dealIndex] });
    this.dealPreview.update({ deals: deals.slice(dealIndex, dealIndex + numDeals) });

    blocks.forEach((block, index) => {
      const puyo = state.puyos[index];
      const color = puyo.color || block;

      this.blocks[index].update({
        color,
        classes: puyo.classes,
      });
    });

    if (!state.chainNumber && !this.hidePreviewGhosts && !fullUpdate) {
      this.piece.previewPuyos.forEach((puyo) => {
        const { x, y, color } = puyo;

        this[y][x].update({ color, classes: ['preview'] });
      });
    }

    if (!fullUpdate) {
      return;
    }

    this.updateAnimations(state);

    if (incomingNuisance !== this.displayState.incomingNuisance) {
      this.incomingDisplay.innerText = `Incoming ${incomingNuisance || 0}`;
      this.displayState.incomingNuisance = incomingNuisance;
    }
    if (totalScore !== this.displayState.totalScore) {
      this.scoreDisplay.innerText = `${totalScore}`;
      this.displayState.totalScore = totalScore;
    }
    if (gameOvers !== this.displayState.gameOvers) {
      this.gameOversDisplay.innerText = `Game overs ${gameOvers}`;
      this.displayState.gameOvers = gameOvers;
    }
    if (allClearBonus !== this.displayState.allClearBonus) {
      if (allClearBonus) {
        this.clearDisplay.innerText = ' + clear';
      } else {
        this.clearDisplay.innerText = '';
      }
      this.displayState.allClearBonus = allClearBonus;
    }
  }

  updateAnimations(state) {
    state.puyos.forEach((puyo, index) => {
      if (puyo.from == null) {
        return;
      }
      const block = this.blocks[index];
      const y = Math.floor(index / this.width);
      const height = y - Math.floor(puyo.from / this.width);
      const duration = Math.sqrt(height + 5) / 25;

      setStyle(block, { transform: `translateY(-${100 * height}%)`, transition: 'transform 0s' });
      window.setTimeout(() => {
        setStyle(block, { transform: 'translateY(0)', transition: `transform ${duration}s`, transitionTimingFunction: 'ease-in' });
      }, 15);
      window.setTimeout(() => {
        setStyle(block, { transform: '', transition: '', transitionTimingFunction: '' });
        this.update();  // Shows preview ghosts
      }, 1000 * duration);
    });
  }
}
