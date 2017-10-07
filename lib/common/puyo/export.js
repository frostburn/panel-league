const chunk = require('lodash/chunk');
const forOwn = require('lodash/forOwn');
const sumBy = require('lodash/sumBy');

const { GameEngine } = require('../engine');

function exportSingle(events, width) {
  const result = {
    width,
    track: [],
    events: [],
  };
  const items = [];

  events.forEach((event) => {
    if (event.type === 'addPuyos') {
      items.push([parseInt(event.time, 10), event.blocks]);
    } else {
      result.events.push(event);
    }
  });
  items.sort((a, b) => a[0] - b[0]);
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
  const deals = [];

  data.events.forEach((event) => {
    engine.addEvent(event);
  });
  chunk(data.track, data.width).forEach((line) => {
    blocks.push(...line);
    if (sumBy(blocks, block => !!block) > 1) {
      loadBlocks(engine, blocks);
      const deal = blocks.filter(x => x);
      deal.sort();
      deals.push(deal);
      blocks = [];
    }
  });
  deals.push(...data.deals);
  engine.time = 0;
  const state = JSON.parse(engine.initialStateJSON);

  state.deals = deals;
  engine.initialStateJSON = JSON.stringify(state);
  engine.invalidateCache();
  return engine;
}

function exportEndless(engine) {
  const state = engine.currentState;
  const events = [];

  forOwn(engine.eventsByTime, (engineEvents) => {
    engineEvents.forEach((event) => {
      events.push(event);
    });
  });
  const data = exportSingle(events, engine.width);
  data.deals = state.deals.slice(-state.numDeals);
  return data;
}

function exportDuel(engine) {
  const state = engine.currentState;
  const playerEvents = [[], []];

  forOwn(engine.eventsByTime, (events) => {
    events.forEach((event) => {
      playerEvents[event.player].push(event);
    });
  });

  return {
    deals: state.deals.slice(-state.numDeals),
    players: [
      exportSingle(playerEvents[0], engine.width),
      exportSingle(playerEvents[1], engine.width),
    ],
  };
}

function importDuel(data) {
  const engine = new GameEngine({ stepper: 'puyo:duel' });
  const playerPuyos = [[], []];
  const deals = [];

  [0, 1].forEach((player) => {
    const playerData = data.players[player];
    let blocks = [];

    playerData.events.forEach((event) => {
      engine.addEvent(event);
    });
    chunk(playerData.track, playerData.width).forEach((line) => {
      blocks.push(...line);
      if (sumBy(blocks, block => !!block) > 1) {
        playerPuyos[player].push(blocks);
        blocks = [];
      }
    });
  });
  let puyos = playerPuyos[0];

  if (playerPuyos[1].length > puyos) {
    puyos = playerPuyos[1];
  }
  puyos.forEach((blocks) => {
    const deal = blocks.filter(x => x);
    deal.sort();
    deals.push(deal);
  });
  deals.push(...data.deals);

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
  const state = JSON.parse(engine.initialStateJSON);

  state.deals = deals;
  engine.initialStateJSON = JSON.stringify(state);
  engine.invalidateCache();
  return engine;
}

module.exports = {
  exportEndless,
  importEndless,
  exportDuel,
  importDuel,
};
