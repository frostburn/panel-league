const GameEngine = require('../lib/engine.js');
const shuffle = require('../lib/util.js').shuffle;

// Block colors
const R = 'red';
const G = 'green';
const B = 'blue';
const _ = null;

// Fixed ruleset for dynamic chain tests
const dynamicOptions = {
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
};

module.exports.testDeterminism = function (test) {
  // Make two copies of the same game.
  const firstGame = new GameEngine();
  const secondGame = new GameEngine();
  secondGame.importState(firstGame.exportState());

  const numBlocks = firstGame.width * firstGame.height;

  // Create random events.
  const events = [];
  for (let i = 0; i < 1000; ++i) {
    const eventTime = parseInt(Math.random() * 50);
    if (Math.random() < 0.9) {
      events.push([eventTime, "swap", parseInt(Math.random() * numBlocks)]);
    }
    else {
      events.push([eventTime, "addRow"]);
    }
  }

  // Play the events on the first game.
  events.forEach((event) => {
    firstGame.addEvent(...event);
  });
  // Scramble the events and play them back on the second game.
  shuffle(events);
  events.forEach((event) => {
    secondGame.addEvent(...event);
  });

  // The engine is supposed to be deterministic so the final states should agree.
  for (let i = 0; i < 100; ++i) {
    firstGame.step();
    secondGame.step();
  }
  let firstState = firstGame.step();
  let secondState = secondGame.step();

  test.expect(1);
  test.strictEqual(
    JSON.stringify(firstState),
    JSON.stringify(secondState),
    'Indeterministic result'
  );
  test.done();
};

// A helpful debug printer.
function printColors (game) {
  let row = '';
  game.colors.forEach((color, index) => {
    let block = '_';
    switch (color) {
      case R:
        block = 'R';
        break;
      case G:
        block = 'G';
        break;
      case B:
        block = 'B';
        break;
    }
    row += block + ' ';
    if (index % game.width === game.width - 1) {
      console.log(row);
      row = '';
    }
  });
}

function runGame(game, numSteps) {
  let maxChain = 0;
  for (let i = 0; i < numSteps; ++i) {
    maxChain = Math.max(
      maxChain,
      game.step().chainNumber
    );
  }
  return maxChain;
}

module.exports.testHorizontalChain = function (test) {
  const horizontalSetup = [
    _, G, G, R, R, _,
    G, R, R, B, B, B,
  ];
  const game = new GameEngine({
    width: 6,
    height: 2,
    colors: horizontalSetup,
  });
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(game.colors.every(color => color === null));
  test.done();
}

module.exports.testVerticalChain = function (test) {
  const verticalSetup = [
    B,
    B,
    G,
    G,
    R,
    R,
    R,
    G,
    B,
  ];
  const game = new GameEngine({
    width: 1,
    height: 9,
    colors: verticalSetup,
  });
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(game.colors.every(color => color === null));
  test.done();
}

module.exports.testTimeLag = function (test) {
  const setup = [
    R, _, _,
    R, _, _,
    G, B, B,
    G, B, B,
    G, G, G,
    R, B, B,
  ];
  const game = new GameEngine({
    width: 3,
    height: 6,
    colors: setup,
  });
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(game.colors.every(color => color === null));
  test.done();
}

module.exports.testMovingWhileFlashing = function (test) {
  const setup = [
    G, _, G, _,
    G, R, R, R,
  ];
  const options = Object.assign(
    {width: 4, height: 2, colors: setup},
    dynamicOptions
  );
  const game = new GameEngine(options);
  game.addEvent(1, "swap", 0);
  const maxChain = runGame(game, 12);

  test.expect(2);
  test.strictEqual(maxChain, 1);
  test.ok(game.colors.every(color => color === null));
  test.done();
}

module.exports.testNoFlight = function (test) {
  const setup = [
    B, _, _,
    B, _, B,
  ];
  const options = Object.assign(
    {width: 3, height: 2, colors: setup},
    dynamicOptions
  );
  const game = new GameEngine(options);
  game.addEvent(0, "swap", 0);
  game.addEvent(1, "swap", 1);
  const maxChain = runGame(game, 8);

  test.expect(2);
  test.strictEqual(maxChain, 0);
  test.ok(game.colors.every(color => color === null));
  test.done();
}

module.exports.testInsertSupport = function (test) {
  const setup = [
    _, G, _, _,
    _, R, _, _,
    B, R, G, G,
    B, R, R, B,
  ];
  const options = Object.assign(
    {width: 4, height: 4, colors: setup},
    dynamicOptions
  );

  const timeRange = 5;
  test.expect(2 * timeRange);
  for (let time = 4; time < 4 + timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent(time, "swap", 8);
    const maxChain = runGame(game, 16);

    test.strictEqual(maxChain, 1);
    test.ok(game.colors.every(color => color !== G));
  }
  test.done();
}

module.exports.testInsertChain = function (test) {
  const setup = [
    _, G,
    _, R,
    G, R,
    B, R,
    B, G,
  ];
  const options = Object.assign(
    {width: 2, height: 5, colors: setup},
    dynamicOptions
  );

  const timeRange = 5;
  test.expect(2 * timeRange);
  for (let time = 4; time < 4 + timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent(time, "swap", 4);
    const maxChain = runGame(game, 16);

    test.strictEqual(maxChain, 1);
    test.ok(game.colors.every(color => color !== G));
  }
  test.done();
}

module.exports.testFallThrough = function (test) {
  const setup = [
    R, _, _, _,
    B, _, R, R,
    B, G, G, G,
  ];
  const options = Object.assign(
    {width: 4, height: 3, colors: setup},
    dynamicOptions
  );

  const timeRange = 4;
  test.expect(timeRange);
  for (let time = 0; time < timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent(time, "swap", 0);
    const maxChain = runGame(game, 12);
    test.strictEqual(maxChain, 1);
  }
  test.done();
}

module.exports.testFallOn = function (test) {
  const setup = [
    B, _, _,
    R, _, _,
    B, _, _,
    B, _, _,
    G, G, G,
  ];
  const options = Object.assign(
    {width: 3, height: 5, colors: setup},
    dynamicOptions
  );

  const timeRange = 2;
  test.expect(2 * timeRange);
  for (let time = 0; time < timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent(time, "swap", 3);
    runGame(game, 9);
    test.strictEqual(game.colors[12], B);
    const maxChain = runGame(game, 3);
    test.strictEqual(maxChain, 1);
  }
  test.done();
}

module.exports.testLateSlip = function (test) {
  const setup = [
    _, R, _,
    R, B, _,
    G, G, R,
    B, G, B,
    G, G, B,
  ];
  const options = Object.assign(
    {width: 3, height: 5, colors: setup},
    dynamicOptions
  );

  const timeRange = 2;
  test.expect(timeRange);
  for (let time = 8; time < 8 + timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent(time, "swap", 12);
    const maxChain = runGame(game, 22);
    test.strictEqual(maxChain, 2);
  }
  test.done();
}
