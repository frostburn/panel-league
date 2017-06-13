const { GameEngine } = require('../../lib/common/engine');
const JKISS31 = require('../../lib/common/jkiss');
const basic = require('../../lib/common/puyo/basic');

module.exports.testEndless = function (test) {
  const game = new GameEngine({ stepper: 'puyo:endless' });

  game.addEvent({
    time: 0,
    type: 'addPuyos',
    blocks: [1, 1, 0, 0, 0, 0],
  });
  game.addEvent({
    time: 1,
    type: 'addPuyos',
    blocks: [0, 0, 2, 2, 0, 0],
  });
  game.addEvent({
    time: 2,
    type: 'addPuyos',
    blocks: [0, 0, 1, 1, 0, 0],
  });
  game.addEvent({
    time: 3,
    type: 'addPuyos',
    blocks: [0, 0, 0, 0, 2, 2],
  });
  let state;
  game.step();
  game.step();
  state = game.step();
  test.expect(8);
  test.deepEqual(
    state.blocks.slice(-12),
    [
      0, 0, 1, 1, 0, 0,
      1, 1, 2, 2, 0, 0,
    ],
    'Puyos not added correctly'
  );
  state = game.step();
  test.strictEqual(state.chainNumber, 1, 'Chain not started correctly');
  test.strictEqual(state.totalScore, 80, 'Incorrect score');
  state = game.step();
  test.ok(state.blocks.every(block => !block), 'All clear failed');
  test.strictEqual(state.chainScore, 400, 'Incorrect chain score');
  state = game.step();
  test.strictEqual(state.chainNumber, 0, 'Chain not cleared');
  test.strictEqual(state.chainScore, 0, 'Chain score not cleared');
  test.ok(!state.allClearBonus, 'All clear bonus not cleared');
  test.done();
};

module.exports.testEndlessRandom = function (test) {
  const game = new GameEngine({ stepper: 'puyo:endless' });
  const RNG = new JKISS31();

  test.expect(1001);
  RNG.scramble();
  let state = game.initialState;
  for (let i = 0; i < 1000; ++i) {
    const blocks = basic.randomPuyos(RNG, state.deals[0], state.width);
    const tail = state.deals.slice(1);

    game.addEvent({
      time: state.time,
      type: 'addPuyos',
      blocks,
    });
    state = game.step();
    test.deepEqual(tail, state.deals.slice(0, -1), 'Deals not advanced correctly');
  }
  test.ok(state.totalScore > 0, 'Score not accumulated');
  test.done();
}

module.exports.testDuelMirror = function (test) {
  const game = new GameEngine({ stepper: 'puyo:duel' });
  const RNG = new JKISS31();

  test.expect(5002);
  RNG.scramble();
  let state = game.initialState;
  for (let i = 0; i < 1000; ++i) {
    const deal = basic.dealForPlayer(state, 0);
    const blocks = basic.randomPuyos(RNG, deal, state.width);
    for (let j = 0; j < 2; ++j) {
      game.addEvent({
        player: j,
        time: state.time,
        type: 'addPuyos',
        blocks,
      });
      test.ok(!state.childStates[j].pendingNuisance);
      test.ok(state.childStates[j].blocks.every(block => block !== basic.nuisancePuyo));
    }
    state = game.step();
    state.childStates[1].player = 0;
    test.deepEqual(state.childStates[0], state.childStates[1]);
  }

  for (let j = 0; j < 2; ++j) {
    test.ok(state.deals.length > state.childStates[j].dealIndex + state.numDeals);
  }
  test.done();
};

module.exports.testDuelSymmetry = function (test) {
  const game = new GameEngine({ stepper: 'puyo:duel' });
  const flippedGame = GameEngine.unserialize(game.serialize());
  const RNG = new JKISS31();

  RNG.scramble();
  const flippedRNG = JKISS31.unserialize(RNG.serialize());

  test.expect(2);
  let state = game.initialState;
  for (let i = 0; i < 1000; ++i) {
    for (let j = 0; j < 2; ++j) {
      const deal = basic.dealForPlayer(state, j);
      const blocks = basic.randomPuyos(RNG, deal, state.width);
      game.addEvent({
        player: j,
        time: state.time,
        type: 'addPuyos',
        blocks,
      });
    }
    state = game.step();
  }
  let flippedState = flippedGame.initialState;
  for (let i = 0; i < 1000; ++i) {
    for (let j = 1; j >= 0; --j) {
      const deal = basic.dealForPlayer(flippedState, j);
      const blocks = basic.randomPuyos(flippedRNG, deal, flippedState.width);
      flippedGame.addEvent({
        player: j,
        time: flippedState.time,
        type: 'addPuyos',
        blocks,
      });
    }
    flippedState = flippedGame.step();
  }
  state.childStates[1].player = 0;
  flippedState.childStates[1].player = 0;
  test.deepEqual(state.childStates[0], flippedState.childStates[1]);
  test.deepEqual(state.childStates[1], flippedState.childStates[0]);
  test.done();
};
