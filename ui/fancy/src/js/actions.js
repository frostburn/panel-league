const random = require('lodash/random');
const uuidV4 = require('uuid/v4');

module.exports = {
  moveSwapperLeft(ui) {
    if (ui.isGameRunning) {
      --ui.grid.swapper.x;
    }
  },

  moveSwapperRight(ui) {
    if (ui.isGameRunning) {
      ++ui.grid.swapper.x;
    }
  },

  moveSwapperUp(ui) {
    if (ui.isGameRunning) {
      --ui.grid.swapper.y;
    }
  },

  moveSwapperDown(ui) {
    if (ui.isGameRunning) {
      ++ui.grid.swapper.y;
    }
  },

  swap(ui, actionArguments = {}) {
    if (ui.isGameRunning) {
      let { x, y } = actionArguments;

      if (x == null || y == null) {
        [x, y] = [ui.grid.swapper.x, ui.grid.swapper.y];
      }
      ui.game.addEvent({
        time: ui.game.time,
        type: 'swap',
        index: x + (y * ui.grid.width)
      });
    }
  },

  addRow(ui) {
    if (ui.isGameRunning) {
      ui.game.addEvent({
        time: ui.game.time,
        type: 'addRow'
      });
    }
  },

  refill(ui) {
    if (ui.isGameRunning) {
      ui.game.addEvent({
        time: ui.game.time,
        type: 'refill'
      });
    }
  },

  addGarbage(ui) {
    if (ui.isGameRunning) {
      const width = random(1, ui.game.width);
      const x = random(0, ui.game.width - width);
      const height = random(1, 3);
      const uuid = uuidV4();

      // UUID is injected for the UI only.
      ui.game.addEvent({
        time: ui.game.time,
        type: 'addGarbage',
        slab: {x, width, height, uuid}
      });
    }
  }
};
