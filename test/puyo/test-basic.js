const basic = require('../../lib/common/puyo/basic');

module.exports.testClearGroups = function (test) {
  const blocks = [
    1, 2, 0,
    -1, 2, 1,
    2, 2, 1,
  ];
  const width = 3;
  const height = 3;
  const blocksWithGhosts = [1, 2, 0].concat(blocks);
  const state = {
    clearThreshold: 4,
    ghostHeight: 1,
    blocks: blocksWithGhosts,
    width,
    height,
    chainNumber: 0,
  };
  const effects = basic.clearGroups(state);

  test.expect(4);
  test.deepEqual(
    state.blocks,
    [
      1, 2, 0,
      1, 0, 0,
      0, 0, 1,
      0, 0, 1,
    ],
    'Group or nuisance not cleared correctly'
  );
  effects.forEach((effect) => {
    if (effect.type === 'score') {
      test.strictEqual(effect.score, 40, 'Wrong score for a single clear');
    } else if (effect.type === 'groupCleared') {
      test.deepEqual(effect.color, 2, 'Wrong color cleared');
      test.deepEqual(effect.indices, [4, 7, 9, 10], 'Inconsistent clearing indices');
    }
  });
  test.done();
};

module.exports.testGravity = function (test) {
  const blocks = [
    1, 0, 0,
    0, 2, 3,
    0, 0, 4,
  ];
  const state = {
    blocks,
    width: 3,
  };
  const effects = basic.handleGravity(state);

  test.expect(5);
  test.deepEqual(
    state.blocks,
    [
      0, 0, 0,
      0, 0, 3,
      1, 2, 4,
    ],
    'Inconsistent fall pattern'
  );
  effects.forEach((effect) => {
    if (effect.type !== 'puyoDropped') {
      return;
    }
    if (effect.color === 1) {
      test.strictEqual(effect.from, 0, 'Wrong initial index');
      test.strictEqual(effect.to, 6, 'Wrong final index');
    } else if (effect.color === 2) {
      test.strictEqual(effect.from, 4, 'Wrong initial index');
      test.strictEqual(effect.to, 7, 'Wrong final index');
    }
  });
  test.done();
};

module.exports.testReceiveNuisance = function (test) {
  const blocks = [
    0, 0, 0,
    0, 1, 0,
  ];
  const state = {
    blocks,
    width: 3,
    height: 2,
    ghostHeight: 0,
    nuisanceX: 0,
    pendingNuisance: 1,
  };
  const effects = basic.receiveNuisance(state);

  test.expect(7);
  test.strictEqual(state.nuisanceX, 1, 'Nuisance placement not updated');
  test.deepEqual(
    state.blocks,
    [
      0, 0, 0,
      -1, 1, 0,
    ],
    'Inconsistent fall pattern'
  );
  effects.forEach((effect) => {
    if (effect.type === 'puyoDropped') {
      test.strictEqual(effect.color, basic.nuisancePuyo, 'Dropped puyo not nuisance');
      test.ok(effect.from < 0, 'Nuisance not dropped off-screen');
      test.ok(effect.to >= 0, 'Nuisance not dropped onto screen');
    }
  });

  state.pendingNuisance = 4;
  basic.receiveNuisance(state);
  test.strictEqual(state.nuisanceX, 2, 'Nuisance placement not updated correctly');
  test.deepEqual(
    state.blocks,
    [
      -1, -1, 0,
      -1, 1, -1,
    ],
    'Inconsistent fall pattern'
  );
  test.done();
};

module.exports.testMaxNuisance = function (test) {
  const blocks = [
    0, 0,
    0, 1,
    0, 2,
    0, 3,
    0, 4,
    0, 5,
  ];
  const state = {
    blocks,
    width: 2,
    height: 6,
    ghostHeight: 0,
    pendingNuisance: 100,
    nuisanceX: 1,
  };

  basic.receiveNuisance(state);
  test.expect(2);
  test.strictEqual(state.pendingNuisance, 90, 'Wrong number of nuisance dropped');
  test.deepEqual(
    state.blocks,
    [
      0, -1,
      -1, 1,
      -1, 2,
      -1, 3,
      -1, 4,
      -1, 5,
    ],
    'Inconsistent fall pattern'
  );
  test.done();
};
