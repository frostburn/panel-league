const {GameEngine} = require('../lib/engine');
const {R, G, B, _, blockTypes, getColors, printColors, shuffleInPlace} = require('../lib/panel-league/util');

// Fixed block types for static tests
const staticOptions = {blockTypes}

// Fixed ruleset for dynamic chain tests
const dynamicOptions = {
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
  blockTypes,
};

module.exports.testDeterminism = function (test) {
  // Make two copies of the same game.
  const firstGame = new GameEngine(staticOptions);
  const secondGame = new GameEngine(staticOptions);
  secondGame.importState(firstGame.exportState());

  const numBlocks = firstGame.width * firstGame.height;

  // Create random events.
  const events = [];
  for (let i = 0; i < 1000; ++i) {
    const eventTime = parseInt(Math.random() * 50);
    if (Math.random() < 0.9) {
      events.push({
        time: eventTime,
        type: "swap",
        index: parseInt(Math.random() * numBlocks)
      });
    }
    else {
      events.push({
        time: eventTime,
        type: "addRow"
      });
    }
  }

  // Play the events on the first game.
  events.forEach((event) => {
    firstGame.addEvent(event);
  });
  // Scramble the events and play them back on the second game.
  shuffleInPlace(events, Math.random);
  events.forEach((event) => {
    secondGame.addEvent(event);
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
  const options = Object.assign(
    {width: 6, height: 2, colors: horizontalSetup},
    staticOptions
  );
  const game = new GameEngine(options);
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(getColors(game).every(color => color === null));
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
  const options = Object.assign(
    {width: 1,height: 9, colors: verticalSetup},
    staticOptions
  )
  const game = new GameEngine(options);
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(getColors(game).every(color => color === null));
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
  const options = Object.assign(
    {width: 3, height: 6, colors: setup},
    staticOptions
  );
  const game = new GameEngine(options);
  const maxChain = runGame(game, 100);

  test.expect(2);
  test.strictEqual(maxChain, 2);
  test.ok(getColors(game).every(color => color === null));
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
  game.addEvent({
    time: 1,
    type: "swap",
    index: 0
  });
  const maxChain = runGame(game, 12);

  test.expect(2);
  test.strictEqual(maxChain, 1);
  test.ok(getColors(game).every(color => color === null));
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
  game.addEvent({
    time: 0,
    type: "swap",
    index: 0
  });
  game.addEvent({
    time: 1,
    type: "swap",
    index: 1
  });
  const maxChain = runGame(game, 8);

  test.expect(2);
  test.strictEqual(maxChain, 0);
  test.ok(getColors(game).every(color => color === null));
  test.done();
}

module.exports.testNoPeek = function (test) {
  const setup = [
    B, _, _,
    B, _, B,
  ];
  const options = Object.assign(
    {width: 3, height: 2, colors: setup},
    dynamicOptions
  );

  const timeRange = 6;
  test.expect(2 * timeRange);
  for (let time = 1; time < 1 + timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent({
      time: 0,
      type: "swap",
      index: 0
    });
    game.addEvent({
      time,
      type: "swap",
      index: 0
    });
    const maxChain = runGame(game, 16);

    test.strictEqual(maxChain, 0);
    test.ok(getColors(game).every(color => color === null));
  }
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
    game.addEvent({
      time,
      type: "swap",
      index: 8
    });
    const maxChain = runGame(game, 16);

    test.strictEqual(maxChain, 1);
    test.ok(getColors(game).every(color => color !== G));
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
    game.addEvent({
      time,
      type: "swap",
      index: 4
    });
    const maxChain = runGame(game, 16);

    test.strictEqual(maxChain, 1);
    test.ok(getColors(game).every(color => color !== G));
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
    game.addEvent({
      time,
      type: "swap",
      index: 0
    });
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
    game.addEvent({
      time,
      type: "swap",
      index: 3
    });
    runGame(game, 9);
    test.strictEqual(getColors(game)[12], B);
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
    game.addEvent({
      time,
      type: "swap",
      index: 12
    });
    const maxChain = runGame(game, 22);
    test.strictEqual(maxChain, 2);
  }
  test.done();
}

module.exports.testNoZeroFallChain = function (test) {
  const setup = [
    _, R, _, _,
    R, B, B, B,
    G, R, G, G,
  ];
  const options = Object.assign(
    {width: 4, height: 3, colors: setup},
    dynamicOptions
  );
  const timeRange = 10;
  test.expect(2 * timeRange);
  for (let time = 1; time < 2 + timeRange; ++time) {
    if (time === 7) {
      // It would be nice to prevent this one too, but having
      // "zero fall" as a one frame tech is fine I guess.
      continue;
    }
    const game = new GameEngine(options);
    game.addEvent({
      time,
      type: "swap",
      index: 4
    });
    const maxChain = runGame(game, 20);
    test.strictEqual(maxChain, 0);
    test.ok(getColors(game).some(block => block === R));
  }
  test.done();
}

module.exports.testCatch = function (test) {
  const setup = [
    _, G,
    _, R,
    G, R,
    G, R,
  ];
  const options = Object.assign(
    {width: 2, height: 4, colors: setup},
    dynamicOptions
  );
  const game = new GameEngine(options);
  game.addEvent({
    time: 8,
    type: "swap",
    index: 2
  });
  const maxChain = runGame(game, 20);;

  test.expect(2);
  test.strictEqual(maxChain, 1);
  test.ok(getColors(game).every(color => color === null));
  test.done();
}

module.exports.testSupportWithFall = function (test) {
  const setup = [
    _, G, _,
    G, R, _,
    B, R, G,
    R, R, B,
  ];
  const options = Object.assign(
    {width: 3, height: 4, colors: setup},
    dynamicOptions
  );

  const timeRange = 5;
  test.expect(2 * timeRange);
  for (let time = 4; time < 4 + timeRange; ++time) {
    const game = new GameEngine(options);
    game.addEvent({
      time,
      type: "swap",
      index: 6
    });
    const maxChain = runGame(game, 20);
    test.strictEqual(maxChain, 1);
    test.ok(getColors(game).every(block => block !== G));
  }
  test.done();
}
