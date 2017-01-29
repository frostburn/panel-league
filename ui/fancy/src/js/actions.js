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
      --ui.grid.swapper.y;
    }
  },
};
