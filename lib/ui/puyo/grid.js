import { el, mount, setStyle } from 'redom';

import Piece from './piece';
import Block from './block';
import DealPreview from './deal-preview';

export default class Grid {
  constructor(state, hidePreviewGhosts) {
    const { width, height, ghostHeight, player, deals } = state;

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
    this.el = el('',
      el('.column',
        el('.display',
          this.incomingDisplay = el('span', 'Incoming 0')
        ),
        this.grid = el('.grid',
          this.piece = new Piece({ grid: this, x: 2, rotation: 0, deal: state.deals[0] }),
        ),
        el('.display',
          this.scoreDisplay = el('span', 'Score 0'),
          this.clearDisplay = el('span')
        ),
        el('.display',
          this.gameOversDisplay = el('span', 'Game overs 0')
        )
      ),
      el('.column-narrow',
        this.dealPreview = new DealPreview({ deals: deals.slice(1) })
      )
    );

    // Construct block rows and mount them.
    this.blocks = [];
    for (let y = 0; y < this.height + this.ghostHeight; ++y) {
      const row = el('.row');

      if (y === 0) {
        row.classList.add('ghost');
      }
      mount(this.grid, row);
      this[y] = {};
      for (let x = 0; x < this.width; ++x) {
        const block = new Block({ x, y });

        mount(row, block);
        this.blocks.push(block);
        this[y][x] = block;
      }
    }
    this.update(state);
  }

  installEventListeners() {
  }

  update(state) {
    const fullUpdate = !!state;

    if (!state) {
      state = this.previousState;
    }
    this.previousState = state;
    const { blocks, totalScore, gameOvers, deals, incomingNuisance, allClearBonus } = state;

    this.piece.update({ deal: deals[0] });
    this.dealPreview.update({ deals: deals.slice(1) });

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
      this.scoreDisplay.innerText = `Score ${totalScore}`;
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
