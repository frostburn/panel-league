/* eslint-env browser, jquery */
/* global GameEngine */

$(() => {
  const $container = $('#game-container');

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
        if (swapperY < GameEngine.height - 1) {
          ++swapperY;
        }
        break;

      case 'ArrowLeft':
        if (swapperX > 0) {
          --swapperX;
        }
        break;

      case 'ArrowRight':
        if (swapperX < GameEngine.width - 2) {
          ++swapperX;
        }
        break;

      case ' ':
        GameEngine.addEvent(
          GameEngine.getTime(),
          'swap',
          swapperX + (GameEngine.width * swapperY)
        );
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
      const swapperIndex = swapperX + (GameEngine.width * swapperY);
      if (i === swapperIndex || i === swapperIndex + 1) {
        $block.css({
          'border-style': 'solid',
          'box-sizing': 'border-box',
        });
      }

      // Mouse input
      $block.click((e) => {
        e.preventDefault();
        GameEngine.addEvent(state.time, 'swap', i);
      });

      $container.append($block);
      if (i % GameEngine.width === GameEngine.width - 1) {
        $container.append($('<div>', { css: { clear: 'left' } }));
      }
    });

    // Status info
    $container.append($('<p>', { text: `Chain number: ${state.chainNumber}` }));
    $container.append($('<p>', { text: `Time step: ${state.time}` }));
  }

  let debugState;

  mainLoop = window.setInterval(() => {
    debugState = GameEngine.step();
    update(debugState);
  }, 1000);

  $('#btn-reset').click(() => {
    GameEngine.setTime(0);
  });
  $('#btn-step').click(() => {
    debugState = GameEngine.step()
    update(debugState);
  });
  $('#btn-back').click(() => {
    GameEngine.setTime(GameEngine.getTime() - 2);
    debugState = GameEngine.step()
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
    $('#export').val(GameEngine.exportState());
  });

  $('#btn-import-replay').click(() => {
    GameEngine.importState($('#export').val());
  });
});
