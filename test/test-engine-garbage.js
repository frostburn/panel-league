const {times} = require('lodash');
const {GameEngine} = require('../lib/engine.js');
const {R, G, B, _} = require('../lib/engine-util.js');

module.exports.testAdd = ((test) => {
  const game = new GameEngine();

  game.addEvent({
    time: 0,
    type: 'addGarbage',
    slab: {x: 0, width: game.width, height: 1}
  });
  game.step();
  const state = game.step();
  test.expect(1);
  test.strictEqual(state.garbage.length, 1, "No garbage slab found");
  test.done();
});

module.exports.testFit = ((test) => {
  const game = new GameEngine({initialRows: 0, width: 6});

  game.addEvent({
    time: 0,
    type: 'addGarbage',
    slab: {x: 0, width: 2, height: 1}
  });
  game.addEvent({
    time: 1,
    type: 'addGarbage',
    slab: {x: 2, width: 2, height: 2}
  });

  times(100, () => game.step());
  state = game.step();
  test.expect(6);
  for (let i = 0; i < 4; ++i) {
    test.ok(state.blocks[i + state.width * (state.height - 1)].color, "Empty block found");
  }
  for (let i = 4; i < 6; ++i) {
    test.ok(!state.blocks[i + state.width * (state.height - 1)].color, "Non-empty block found");
  }
  test.done();
});

module.exports.testOverhang = ((test) => {
  const game = new GameEngine({initialRows: 0});

  game.addEvent({
    time: 0,
    type: 'addGarbage',
    slab: {x: 0, width: 1, height: 2}
  });
  game.addEvent({
    time: 1,
    type: 'addGarbage',
    slab: {x: 0, width: game.width, height: 2}
  });

  times(100, () => game.step());
  state = game.step();
  test.expect(2 * game.width - 1);
  for (let i = 1; i < game.width; ++i) {
    test.ok(!state.blocks[i + state.width * (state.height - 1)].color, "Non-empty block found");
  }
  for (let i = 0; i < game.width; ++i) {
    test.ok(state.blocks[i + state.width * (state.height - 3)].color, "Empty block found");
  }
  test.done();
});

module.exports.testShock = ((test) => {
  setup = [
    _, _, _, _, _, _,
    _, _, _, _, _, _,
    _, _, _, _, _, _,
    _, _, _, _, _, _,
    G, R, G, G, B, B,
  ];
  const game = new GameEngine({width: 6, height: 5, colors: setup});

  game.addEvent({
    time: 0,
    type: 'addGarbage',
    slab: {x: 0, width: game.width, height: 2}
  });
  game.addEvent({
    time: 1,
    type: 'addGarbage',
    slab: {x: 0, width: game.width, height: 2}
  });
  game.addEvent({
    time: 101,
    type: 'swap',
    index: 24
  });

  test.expect(2 + 2 * game.width);
  times(99, () => game.step());
  let state = game.step();
  let numGarbage = state.blocks.reduce((sum, block) => sum + block.garbage, 0);
  test.strictEqual(numGarbage, game.width * 4, 'Not enough garbage found');
  times(99, () => game.step());
  state = game.step();
  numGarbage = state.blocks.reduce((sum, block) => sum + block.garbage, 0);
  test.strictEqual(numGarbage, game.width * 2, 'Garbage not released correctly');
  // We don't control RNG here so prepare for rare matches.
  const shift = game.width * !state.blocks[0].color;
  for (let i = 0; i < game.width; ++i) {
    test.ok(state.blocks[i + shift].garbage, "Garbage not preserved");
    test.ok(!state.blocks[i + game.width + shift].garbage, "Garbage not released");
  }
  test.done();
});
