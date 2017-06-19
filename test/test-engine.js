const { GameEngine } = require('../lib/common/engine');

class TestStepper {
  get name() {
    return 'test:basic';
  }

  initializeState(options) {
    return {
      time: 0,
      power: 1,
    };
  }

  step(state, events) {
    state.power *= 2;
    ++state.time;

    return [];
  }

  postProcess(state) {
    state.weakness = 1 / state.power;
  }
}

module.exports.testGetStates = function (test) {
  const game = new GameEngine({ stepper: new TestStepper() });

  test.expect(5);
  test.deepEqual(
    game.initialState,
    { time: 0, power: 1, weakness: 1 }
  );
  test.deepEqual(
    game.currentState,
    { time: 0, power: 1, weakness: 1 }
  );
  test.strictEqual(game.time, 0);
  game.step();
  test.deepEqual(
    game.initialState,
    { time: 0, power: 1, weakness: 1 }
  );
  test.deepEqual(
    game.currentState,
    { time: 1, power: 2, weakness: 0.5 }
  );
  test.done();
};
