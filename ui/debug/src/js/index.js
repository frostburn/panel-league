/* eslint-env browser, jquery */

const GameEngine = require('../../../../lib/engine');
let EngineClass = GameEngine;

$(() => {
  if ('io' in window) {
    const socket = io();
    EngineClass = class extends GameEngine {
      addEvent(...args) {
        super.addEvent(...args);
        socket.emit('game event', {'event': args});
      }
      addBroadcastEvent(...args) {
        super.addEvent(...args);
      }
    };

    socket.on('connected', (data) => {
      const game = data.game;
      Object.assign(currentGame, data.game);
      currentGame.importCache(data.cache);
      frameRate = data.frameRate;
      mainLoop = window.setInterval(step, 1000 / frameRate);
    });

    // We expect the browser clock to run slower than
    // the server clock so we only implement catch up.
    socket.on('clock', (data) => {
      const serverTime = data.time;
      while (currentGame.time < serverTime) {
        step();
      }
    });

    socket.on('game event', (data) => {
      currentGame.addBroadcastEvent(...data.event);
    });

    // These features are not available when running in slave mode.
    $('#btn-reset').remove();
    $('#btn-step').remove();
    $('#btn-back').remove();
    $('#btn-rules-debug').remove();
    $('#btn-rules-easy').remove();
  }

  const $container = $('#game-container');
  let currentGame = new EngineClass();
  let frameRate = 1;

  let swapperX = 0;
  let swapperY = 0;

  let mainLoop;

  // Keyboard input
  $(window).keydown((e) => {
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
        currentGame.addEvent(
          currentGame.time,
          'swap',
          swapperX + (currentGame.width * swapperY)
        );
        break;

      case ' ':
        currentGame.addEvent(currentGame.time, 'addRow');
        break;

      default:
        break;
    }
  });

  function update(state) {
    $container.empty();
    state.blocks.forEach((block, i) => {
      const $block = $('<div>', {
        css: {
          width: '20px',
          height: '20px',
          float: 'left',
        },
      });

      $block.css('background', block.color || 'transparent');
      if (block.flashTimer >= 0) {
        $block.css('opacity', (block.flashTimer + 1) / (state.flashTime + 2));
      }

      if (block.swapTimer !== 0) {
        // Add a little extra nudge to make initial swapping visible too.
        // Make the nudge unsymmetric to avoid the blocks overlapping during the swap.
        const nudge = (block.swapTimer < 0) ? 0.1 : 0.4;
        let swapRatio = block.swapTimer / (state.swapTime + nudge);
        swapRatio *= 20;
        $block.css('margin-right', swapRatio + "px");
        $block.css('margin-left', -swapRatio + "px");
      }

      if (block.floatTimer > 0) {
        $block.text('F');
      } else if (block.floatTimer === 0) {
        $block.text('f');
      }

      if (block.chaining) {
        $block.text(`${$block.text()}C`);
      }

      // Keyboard UI
      const swapperIndex = swapperX + (currentGame.width * swapperY);
      if (i === swapperIndex || i === swapperIndex + 1) {
        $block.css({
          'border-style': 'solid',
          'box-sizing': 'border-box',
        });
      }

      // Mouse input
      $block.click((e) => {
        e.preventDefault();
        currentGame.addEvent(state.time, 'swap', i);
      });

      $container.append($block);
      if (i % currentGame.width === currentGame.width - 1) {
        $container.append($('<div>', { css: { clear: 'left' } }));
      }
    });

    state.nextRow.forEach((block) => {
      const $block = $('<div>', {
        css: {
          width: '20px',
          height: '20px',
          float: 'left',
          background: block.color,
          opacity: 0.3,
        },
      });
      // Adding new rows
      $block.click((e) => {
        e.preventDefault();
        currentGame.addEvent(state.time, 'addRow');
      });
      $container.append($block);
    });
    $container.append($('<div>', { css: { clear: 'left' } }));

    // Status info
    $container.append($('<p>', { text: `Chain number: ${state.chainNumber}` }));
    $container.append($('<p>', { text: `Time step: ${state.time}` }));
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

  $('#btn-export-replay').click(() => {
    $('#export').val(currentGame.exportState());
  });
  $('#btn-import-replay').click(() => {
    currentGame.importState($('#export').val());
  });

  $('#btn-rules-debug').click(() => {
    window.clearInterval(mainLoop);
    currentGame = new EngineClass();
    frameRate = 1;
    mainLoop = window.setInterval(step, 1000 / frameRate);
  });
  $('#btn-rules-easy').click(() => {
    window.clearInterval(mainLoop);
    currentGame = new EngineClass({
      flashTime: 40,
      floatTime: 30,
      swapTime: 3,
    });
    frameRate = 30;
    mainLoop = window.setInterval(step, 1000 / frameRate);
  });
});
