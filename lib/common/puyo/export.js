const chunk = require('lodash/chunk');
const forOwn = require('lodash/forOwn');
const sumBy = require('lodash/sumBy');

const { GameEngine } = require('../engine');

// TODO: Export deals properly.

function exportSingle(events, width) {
  const result = {
    width,
    track: [],
    events: [],
  };
  const items = [];

  events.forEach((event) => {
    if (event.type == 'addPuyos') {
      items.push([event.time, event.blocks]);
    } else {
      result.events.push(event);
    }
  });
  items.sort();
  items.forEach((item) => {
    chunk(item[1], width).forEach((line) => {
      if (line.some(x => x)) {
        result.track.push(...line);
      }
    });
  });
  return result;
}

function loadBlocks(engine, blocks) {
  while (!engine.callStepper('canPlay')) {
    engine.step();
  }
  engine.addEvent({
    time: engine.time,
    type: 'addPuyos',
    blocks,
  });
}

function importEndless(data) {
  const engine = new GameEngine({ stepper: 'puyo:endless' });
  let blocks = [];

  data.events.forEach((event) => {
    engine.addEvent(event);
  });
  chunk(data.track, data.width).forEach((line) => {
    blocks.push(...line);
    if (sumBy(blocks, block => !!block) > 1) {
      loadBlocks(engine, blocks);
      blocks = [];
    }
  });
  engine.time = 0;
  return engine;
}

function exportEndless(engine) {
  const events = [];

  forOwn(engine.eventsByTime, (engineEvents) => {
    engineEvents.forEach((event) => {
      events.push(event);
    });
  });
  return exportSingle(events, engine.width);
}

function exportDuel(engine) {
  const playerEvents = [[], []];

  forOwn(engine.eventsByTime, (events) => {
    events.forEach((event) => {
      playerEvents[event.player].push(event);
    });
  });
  return [
    exportSingle(playerEvents[0], engine.width),
    exportSingle(playerEvents[1], engine.width),
  ];
}

function importDuel(data) {
  const engine = new GameEngine({ stepper: 'puyo:duel' });
  const blocksQueue = [];
  let playerPuyos = [[], []];

  [0, 1].forEach((player) => {
    let blocks = [];

    data[player].events.forEach((event) => {
      engine.addEvent(event);
    });
    chunk(data[player].track, data[player].width).forEach((line) => {
      blocks.push(...line);
      if (sumBy(blocks, block => !!block) > 1) {
        playerPuyos[player].push(blocks);
        blocks = []
      }
    });
  });
  while (playerPuyos[0].length || playerPuyos[1].length) {
    [0, 1].forEach((player) => {
      if (engine.callStepper('canPlay', { player })) {
        engine.addEvent({
          time: engine.time,
          type: 'addPuyos',
          blocks: playerPuyos[player].shift(),
          player,
        });
      }
    });
    engine.step();
  }
  engine.time = 0;
  return engine;
}

module.exports = {
  exportEndless,
  importEndless,
  exportDuel,
  importDuel,
};
