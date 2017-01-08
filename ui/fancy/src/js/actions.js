module.exports = {
  moveSwapperLeft(ui) {
    if (ui.isGameRunning) {
      --ui.swapper.x;
    }
  },

  moveSwapperRight(ui) {
    if (ui.isGameRunning) {
      ++ui.swapper.x;
    }
  },

  moveSwapperUp(ui) {
    if (ui.isGameRunning) {
      --ui.swapper.y;
    }
  },

  moveSwapperDown(ui) {
    if (ui.isGameRunning) {
      ++ui.swapper.y;
    }
  },

  swap(ui, actionArguments = {}) {
    if (ui.isGameRunning) {
      let { x, y } = actionArguments;

      if (x == null || y == null) {
        [x, y] = [ui.swapper.x, ui.swapper.y];
      }
      ui.game.addEvent(ui.game.time, 'swap', x + (y * ui.game.width));
    }
  },

  addRow(ui) {
    if (ui.isGameRunning) {
      ui.game.addEvent(ui.game.time, 'addRow');
      --ui.swapper.y;
    }
  },
};
