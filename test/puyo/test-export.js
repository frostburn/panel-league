const { GameEngine } = require('../../lib/common/engine');
const Exporter = require('../../lib/common/puyo/export');
// const JKISS31 = require('../../lib/common/jkiss');
// const basic = require('../../lib/common/puyo/basic');

module.exports.testEndless = function (test) {
  const engine = new GameEngine({ stepper: 'puyo:endless' });

  engine.addEvent({
    time: 0,
    type: 'addPuyos',
    blocks: [1, 1, 0, 0, 0, 0],
  });
  engine.addEvent({
    time: 1,
    type: 'addPuyos',
    blocks: [0, 0, 2, 2, 0, 0],
  });
  engine.addEvent({
    time: 2,
    type: 'addPuyos',
    blocks: [
      0, 0, 1, 0, 0, 0,
      0, 0, 3, 0, 0, 0,
    ],
  });
  engine.addEvent({
    time: 3,
    type: 'addPuyos',
    blocks: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 3, 2,
      0, 0, 0, 0, 0, 0,
    ],
  });
  let state;
  engine.step();
  engine.step();
  engine.step();
  engine.step();

  const data = Exporter.exportEndless(engine);
  test.expect(2);
  test.deepEqual(data.track, [
    1, 1, 0, 0, 0, 0,
    0, 0, 2, 2, 0, 0,
    0, 0, 1, 0, 0, 0,
    0, 0, 3, 0, 0, 0,
    0, 0, 0, 0, 3, 2
  ]);

  const engineCopy = Exporter.importEndless(data);
  engineCopy.step();
  engineCopy.step();
  engineCopy.step();
  engineCopy.step();
  test.deepEqual(engineCopy.currentState.blocks, [
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0,
    0, 0, 3, 0, 0, 0,
    1, 1, 2, 2, 3, 2
  ]);

  test.done();
};

module.exports.testDuel = function (test) {
  const engine = new GameEngine({ stepper: 'puyo:duel' });

  engine.addEvent({
    time: 0,
    type: 'addPuyos',
    player: 0,
    blocks: [1, 1, 0, 0, 0, 0],
  });
  engine.addEvent({
    time: 0,
    type: 'addPuyos',
    player: 1,
    blocks: [0, 0, 0, 0, 1, 1],
  });
  engine.addEvent({
    time: 1,
    type: 'termination',
    reason: 'The test must go on',
    player: 0,
  });
  engine.step();

  const data = Exporter.exportDuel(engine);
  test.expect(4);
  test.deepEqual(data[0].track, [1, 1, 0, 0, 0, 0]);
  test.deepEqual(data[1].track, [0, 0, 0, 0, 1, 1]);

  const engineCopy = Exporter.importDuel(data);
  engineCopy.step();
  const state = engineCopy.step();

  test.ok(state.status.terminated);
  test.deepEqual(state.childStates[1].blocks.slice(72), [0, 0, 0, 0, 1, 1]);
  test.done();
}
