const GameEngine = require('../lib/engine.js');
const shuffle = require('../lib/util.js').shuffle;

// Block colors
const R = 'red';
const G = 'green';
const B = 'blue';
const _ = null;

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
