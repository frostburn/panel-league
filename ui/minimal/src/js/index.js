/* eslint-env browser, jquery */

$(() => {
  const $container = $('#game-container');
  const socket = io();
  let swapperX = 0;
  let swapperY = 0;
  let height = 8;
  let width = 6;
  let currentTime = 0;

  // Keyboard input
  $(window).keydown((e) => {
    switch (e.key) {
      case 'ArrowUp':
        if (swapperY > 0) {
          --swapperY;
        }
        break;

      case 'ArrowDown':
        if (swapperY < height - 1) {
          ++swapperY;
        }
        break;

      case 'ArrowLeft':
        if (swapperX > 0) {
          --swapperX;
        }
        break;

      case 'ArrowRight':
        if (swapperX < width - 2) {
          ++swapperX;
        }
        break;

      // The f key was chosen as it is in a natural position for the left hand.
      case 'f':
        socket.emit('game event', {
          'event': [
            currentTime,
            'swap',
            swapperX + (width * swapperY)
          ]
        });
        break;

      case ' ':
        socket.emit('game event', {
          'event': [
            currentTime,
            'addRow'
          ]
        });
        break;

      default:
        break;
    }
  });

  function update(state) {
    width = state.width;
    height = state.height;
    currentTime = state.time;
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
      const swapperIndex = swapperX + (width * swapperY);
      if (i === swapperIndex || i === swapperIndex + 1) {
        $block.css({
          'border-style': 'solid',
          'box-sizing': 'border-box',
        });
      }

      $container.append($block);
      if (i % state.width === state.width - 1) {
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
      $container.append($block);
    });
    $container.append($('<div>', { css: { clear: 'left' } }));

    // Status info
    $container.append($('<p>', { text: `Chain number: ${state.chainNumber}` }));
    $container.append($('<p>', { text: `Time step: ${state.time}` }));
  }

  socket.on('update', (data) => {
    update(data.state);
  });
});
