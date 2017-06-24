import { el, mount } from 'redom';

import Piece from './piece';
import Block from './block';
import DealPreview from './deal-preview';

export default class Grid {
  constructor(state) {
    const { width, height, ghostHeight, player, deals } = state;

    this.width = width;
    this.height = height;
    this.ghostHeight = ghostHeight;
    this.player = player;

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
    if (!state) {
      state = this.previousState;
    }
    this.previousState = state;
    const { blocks, totalScore, gameOvers, deals, incomingNuisance, allClearBonus } = state;

    this.piece.update({ deal: deals[0] });
    this.dealPreview.update({ deals: deals.slice(1) });

    blocks.forEach((block, index) => {
      this.blocks[index].update({
        color: block,
        classes: state.puyos[index].classes,
      });
    });

    if (!state.chainNumber) {
      this.piece.previewPuyos.forEach((puyo) => {
        const { x, y, color } = puyo;

        this[y][x].update({ color, classes: ['preview'] });
      });
    }

    if (incomingNuisance !== this.displayState.incomingNuisance) {
      this.incomingDisplay.innerText = `Incoming ${incomingNuisance || 0}`;
      this.displayState.incomingNuisance = incomingNuisance;
    }
    if (totalScore !== this.displayState.totalScore) {
      this.scoreDisplay.innerText = `Score ${totalScore}`;
      this.displayState.totalScore = totalScore;
    }
    if (gameOvers !== this.displayState.gameOvers) {
      console.log("yhyy");
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
}
