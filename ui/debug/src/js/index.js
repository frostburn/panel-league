/* eslint-env browser, jquery */

const {GameEngine, ScoringStepper} = require('../../../../lib/engine');
const Grid = require('./grid');
const soundEffects = require('./sound-effects');
const random = require('lodash/random');
let EngineClass = GameEngine;

$(() => {
  if ('io' in window) {
    let waitTime = 0;
    const socket = io();
    EngineClass = class extends GameEngine {
      addEvent(event) {
        super.addEvent(event);
        socket.emit('game event', {'event': event});
      }
      addBroadcastEvent(event) {
        super.addEvent(event);
      }
    };

    socket.on('connected', (data) => {
      const game = data.game;
      const stepper = currentGame.stepper;
      const effects = currentGame.effects;
      const listeners = currentGame.listeners;
      Object.assign(currentGame, data.game);
      currentGame.stepper = stepper;
      currentGame.effects = effects;
      currentGame.listeners = listeners;
      currentGame.importCache(data.cache);
      frameRate = data.frameRate;
      mainLoop = window.setInterval(() => {
        if (waitTime-- <= 0) {
          step();
        }
      }, 1000 / frameRate);
    });

    socket.on('clock', (data) => {
      const serverTime = data.time;
      while (currentGame.time < serverTime) {
        step();
      }
      waitTime = currentGame.time - serverTime;
    });

    socket.on('game event', (data) => {
      currentGame.addBroadcastEvent(data.event);
    });

    // These features are not available when running in slave mode.
    $('#btn-reset').remove();
    $('#btn-step').remove();
    $('#btn-back').remove();
    $('#btn-rules-debug').remove();
    $('#btn-rules-easy').remove();
  }

  const $container = $('#game-container');
  const $effects = $('#game-effects');
  let currentGame = new EngineClass();
  let frameRate = 1;
  const grid = new Grid(currentGame, $container);


  // Sound effects.
  currentGame.on('blockLanded', () => {
    soundEffects.ping(400 + Math.random() * 10, 0.1 + Math.random() * 0.02, 0.5);
  });
  currentGame.on('flashDone', () => {
    soundEffects.buzz(20, 0.2, 0.25);
  });
  currentGame.on('matchMade', () => {
    soundEffects.pow(200, 0.15, 30);
  });
  currentGame.on('chainMatchMade', (effect) => {
    soundEffects.pow(300 + 25 * effect.chainNumber, 0.15, 20);
  });
  currentGame.on('chainDone', (effect) => {
    const freqs = Array.from([1, 1.5, 2], (f) => (220 + 20 * effect.chainNumber) * f);
    soundEffects.fanfare(freqs, 0.2, 0.5);
  });

  let swapperX = 0;
  let swapperY = 0;

  let mainLoop;

  // Keyboard input
  $(window).keydown((e) => {
    displaySwapper('none');
    switch (e.key) {
      case 'ArrowUp':
        if (swapperY > 0) {
          --swapperY;
        }
        break;

      case 'ArrowDown':
        if (swapperY < currentGame.height - 1) {
          ++swapperY;
        }
        break;

      case 'ArrowLeft':
        if (swapperX > 0) {
          --swapperX;
        }
        break;

      case 'ArrowRight':
        if (swapperX < currentGame.width - 2) {
          ++swapperX;
        }
        break;

      // The f key was chosen as it is in a natural position for the left hand.
      case 'f':
        currentGame.addEvent({
          time: currentGame.time,
          type: 'swap',
          index: swapperX + (currentGame.width * swapperY)
        });
        break;

      case ' ':
        currentGame.addEvent({
          time: currentGame.time,
          type: 'addRow'
        });
        break;

      default:
        break;
    }
    displaySwapper('solid');
  });

  function displaySwapper(borderStyle) {
    const index = swapperX + (currentGame.width * swapperY);
    grid.$blocks[index].css({
      'border-style': borderStyle,
      'box-sizing': 'border-box',
    });
    grid.$blocks[index + 1].css({
      'border-style': borderStyle,
      'box-sizing': 'border-box',
    });
  }
  displaySwapper('solid');

  function update(state) {
    grid.update(state);
  }

  let debugState;
  function step() {
    debugState = currentGame.step();
    update(debugState);
  }

  if (!('io' in window)) {
    mainLoop = window.setInterval(step, 1000 / frameRate);
  }

  $('#btn-reset').click(() => {
    currentGame.invalidateCache();
    currentGame.time = 0;;
  });
  $('#btn-step').click(step);
  $('#btn-back').click(() => {
    currentGame.invalidateCache();
    currentGame.time -= 2;
    debugState = currentGame.step()
    update(debugState);
  });
  $('#btn-kill').click(() => {
    if (mainLoop != null) {
      window.clearInterval(mainLoop);
      mainLoop = null;
    }
  });
  $('#btn-print').click(() => {
    console.log(debugState);
  });

  $('#btn-garbage').click(() => {
    const width = random(1, currentGame.width);
    const x = random(0, currentGame.width - width);
    const height = random(1, 3);
    currentGame.addEvent({
      time: currentGame.time,
      type: 'addGarbage',
      slab: {x, width, height}
    });
  });

  $('#btn-export-replay').click(() => {
    $('#export').val(currentGame.exportState());
  });
  $('#btn-import-replay').click(() => {
    currentGame.importState($('#export').val());
  });

  $('#btn-rules-debug').click(() => {
    const listeners = currentGame.listeners;
    window.clearInterval(mainLoop);
    currentGame = new EngineClass();
    currentGame.listeners = listeners;
    frameRate = 1;
    grid.game = currentGame;
    mainLoop = window.setInterval(step, 1000 / frameRate);
  });
  $('#btn-rules-easy').click(() => {
    const listeners = currentGame.listeners;
    window.clearInterval(mainLoop);
    currentGame = new EngineClass({
      stepper: ScoringStepper,
      flashTime: 40,
      floatTime: 20,
      swapTime: 3,
      garbageFlashTime: 2,
      blockTypes: ['red', 'gold', 'lawngreen', 'darkcyan', 'blue', 'blueviolet'],
    });
    currentGame.listeners = listeners;
    frameRate = 30;
    grid.game = currentGame;
    mainLoop = window.setInterval(step, 1000 / frameRate);
  });

  $('#btn-bonus-game').click(() => {
    const $bonusContainer = $('<div>');
    const bonusGame = new EngineClass();
    const bonusGrid = new Grid(bonusGame, $bonusContainer);
    $('body').append($bonusContainer);
    window.setInterval(() => {bonusGrid.update(bonusGame.step())}, 300);
  });
});
