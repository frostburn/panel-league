const GameEngine = require('../lib/engine.js');
const shuffle = require('../lib/util.js').shuffle;

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
