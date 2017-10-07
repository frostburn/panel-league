const { GameEngine } = require('../../lib/common/engine');
const Exporter = require('../../lib/common/puyo/export');

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
  test.expect(3);
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
  state = engineCopy.step();
  test.deepEqual(state.blocks, [
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
  test.deepEqual(
    state.deals.slice(0, 4),
    [[1, 1], [2, 2], [1, 3], [2, 3]]
  );

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
  test.expect(6);
  test.deepEqual(data.players[0].track, [1, 1, 0, 0, 0, 0]);
  test.deepEqual(data.players[1].track, [0, 0, 0, 0, 1, 1]);
  test.strictEqual(data.deals.length, engine.currentState.numDeals);

  const engineCopy = Exporter.importDuel(data);
  engineCopy.step();
  const state = engineCopy.step();

  test.ok(state.status.terminated);
  test.deepEqual(state.childStates[1].blocks.slice(72), [0, 0, 0, 0, 1, 1]);
  test.deepEqual(state.deals[0], [1, 1]);
  test.done();
}

module.exports.testEndless2 = function (test) {
  const serialized = {"attrs":{"stateCacheSize":128,"_time":37,"eventsByTime":{"0":[{"time":0,"type":"addPuyos","blocks":[4,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0]}],"1":[{"time":1,"type":"addPuyos","blocks":[0,4,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0]}],"2":[{"time":2,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3]}],"3":[{"time":3,"type":"addPuyos","blocks":[0,0,0,0,1,0,0,0,0,0,3,0,0,0,0,0,0,0]}],"4":[{"time":4,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,4,0,0]}],"5":[{"time":5,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,1]}],"6":[{"time":6,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,3,4,0,0,0,0,0,0]}],"7":[{"time":7,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,4,0,0,0,0,0,2,0,0,0]}],"8":[{"time":8,"type":"addPuyos","blocks":[0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0]}],"9":[{"time":9,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,4,3,0,0,0,0,0,0,0]}],"10":[{"time":10,"type":"addPuyos","blocks":[0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0]}],"11":[{"time":11,"type":"addPuyos","blocks":[0,0,0,0,0,0,2,1,0,0,0,0,0,0,0,0,0,0]}],"12":[{"time":12,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1]}],"13":[{"time":13,"type":"addPuyos","blocks":[0,0,0,0,0,0,3,0,0,0,0,0,3,0,0,0,0,0]}],"14":[{"time":14,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0]}],"15":[{"time":15,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,3,0,0,0,0,0,2,0,0,0,0]}],"16":[{"time":16,"type":"addPuyos","blocks":[0,0,0,0,0,0,2,3,0,0,0,0,0,0,0,0,0,0]}],"17":[{"time":17,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,4,2,0,0,0,0,0,0]}],"18":[{"time":18,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,2]}],"19":[{"time":19,"type":"addPuyos","blocks":[0,0,0,0,0,0,1,3,0,0,0,0,0,0,0,0,0,0]}],"20":[{"time":20,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,3]}],"21":[{"time":21,"type":"addPuyos","blocks":[0,3,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0]}],"22":[{"time":22,"type":"addPuyos","blocks":[0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,0,0]}],"30":[{"time":30,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0]}],"31":[{"time":31,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,2,0]}],"33":[{"time":33,"type":"addPuyos","blocks":[0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0]}],"35":[{"time":35,"type":"addPuyos","blocks":[0,0,1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0]}],"36":[{"time":36,"type":"addPuyos","blocks":[0,0,0,1,0,0,0,0,0,3,0,0,0,0,0,0,0,0]}],"37":[{"time":37,"type":"termination","player":0,"reason":"Player 0 quit"}]},"initialStateJSON":"{\"time\":0,\"totalScore\":0,\"chainScore\":0,\"dropScore\":0,\"leftoverScore\":0,\"chainNumber\":0,\"allClearBonus\":false,\"chainAllClearBonus\":false,\"pendingNuisance\":0,\"nuisanceX\":0,\"gameOvers\":0,\"dealIndex\":0,\"width\":6,\"height\":12,\"ghostHeight\":1,\"targetScore\":70,\"clearThreshold\":4,\"blocks\":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],\"effects\":[],\"deals\":[[2,4],[2,4],[1,3]],\"RNG\":\"{\\\"x\\\":1162679243,\\\"y\\\":-2005284188,\\\"z\\\":212629697,\\\"w\\\":740071279,\\\"c\\\":0}\",\"numColors\":4,\"numDeals\":3}","lastValidTime":37},"width":6,"height":8,"stepper":"puyo:endless","cache":{"time":0,"state":"{\"time\":0,\"totalScore\":0,\"chainScore\":0,\"dropScore\":0,\"leftoverScore\":0,\"chainNumber\":0,\"allClearBonus\":false,\"chainAllClearBonus\":false,\"pendingNuisance\":0,\"nuisanceX\":0,\"gameOvers\":0,\"dealIndex\":0,\"width\":6,\"height\":12,\"ghostHeight\":1,\"targetScore\":70,\"clearThreshold\":4,\"blocks\":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],\"effects\":[],\"deals\":[[2,4],[2,4],[1,3]],\"RNG\":\"{\\\"x\\\":1162679243,\\\"y\\\":-2005284188,\\\"z\\\":212629697,\\\"w\\\":740071279,\\\"c\\\":0}\",\"numColors\":4,\"numDeals\":3}"}};
  const engine = GameEngine.unserialize(JSON.stringify(serialized));
  const data = Exporter.exportEndless(engine);
  const engineCopy = Exporter.importEndless(data);

  engineCopy.time = engine.time;
  test.expect(1);
  test.deepEqual(engine.currentState.blocks, engineCopy.currentState.blocks);
  test.done();
}
