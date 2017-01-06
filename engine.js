/* eslint-env browser, jquery */

$(() => {
  const WIDTH = 6;
  const HEIGHT = 8;

  let time = 0;
  let eventQueue = [];

  let swapperX = 0;
  let swapperY = 0;

  function blocksValid(block1, block2) {
    if (!block1 || !block2) {
      return false;
    }
    if (block1.flashTimer >= 0 || block2.flashTimer >= 0) {
      return false;
    }
    if (block1.floatTimer > 0 || block2.floatTimer > 0) {
      return false;
    }

    return true;
  }

  function blocksCanSwap(block1, block2) {
    return blocksValid(block1, block2);
  }

  function blocksMatch(block1, block2) {
    if (!blocksValid(block1, block2)) {
      return false;
    }
    if (block1.floatTimer === 0 || block2.floatTimer === 0) {
      return false;
    }
    if (!block1.solid || !block2.solid) {
      return false;
    }

    return (block1.color === block2.color);
  }

  function clearBlock(block) {
    block.color = '';
    block.solid = false;
    block.flashTimer = -1;
    block.floatTimer = -1;
    block.chaining = false;
  }

  // XXX: Chaining information is somehow propageted to unrelated matches and falling blocks.
  function step(stateJSON, events) {
    const state = JSON.parse(stateJSON);
    const blocks = state.blocks;

    ++state.time;
    while (events.length) {
      const [unused, type, param] = events.pop();

      if (type === 'swap') {
        if (param % WIDTH < WIDTH - 1) {
          const block1 = blocks[param];
          const block2 = blocks[param + 1];

          if (blocksCanSwap(block1, block2)) {
            blocks[param] = block2;
            blocks[param + 1] = block1;
          }
        }
      }
    }

    // Iterate from bottom to top to handle gravity
    for (let i = blocks.length - 1; i >= 0; --i) {
      const block = blocks[i];

      if (!block.solid) {
        continue;
      }

      const bellow = blocks[i + WIDTH];
      if (bellow && (!bellow.solid || bellow.floatTimer >= 0)) {
        if (block.floatTimer < 0) {
          if (bellow.solid) {
            block.floatTimer = bellow.floatTimer;
          } else {
            block.floatTimer = state.floatTime;
          }
          block.chaining = bellow.chaining;
        } else if (!block.floatTimer) {
          blocks[i] = bellow;
          blocks[i + WIDTH] = block;
        }
      } else {
        block.floatTimer = -1;
      }
    }

    // Match three or more similar blocks horizontally or vertically
    blocks.forEach((block, i) => {
      const bellow = blocks[i + WIDTH];
      const above = blocks[i - WIDTH];
      let left;
      let right;

      if (i % WIDTH > 0) {
        left = blocks[i - 1];
      }
      if (i % WIDTH < WIDTH - 1) {
        right = blocks[i + 1];
      }

      if (blocksMatch(left, block) && blocksMatch(block, right)) {
        left.matching = true;
        block.matching = true;
        right.matching = true;
      }

      if (blocksMatch(bellow, block) && blocksMatch(block, above)) {
        above.matching = true;
        block.matching = true;
        bellow.matching = true;
      }
    });

    // Propagate chaining information
    let floodFillActive = true;
    while (floodFillActive) {
      floodFillActive = false;
      blocks.forEach((block, i) => {
        const bellow = blocks[i + WIDTH];
        const above = blocks[i - WIDTH];
        let left;
        let right;

        if (i % WIDTH > 0) {
          left = blocks[i - 1];
        }
        if (i % WIDTH < WIDTH - 1) {
          right = blocks[i + 1];
        }

        if (block.chaining) {
          [left, right, above, bellow].forEach((neighbour) => {
            if (neighbour && neighbour.matching && !neighbour.chaining) {
              neighbour.chaining = true;
              floodFillActive = true;
            }
          });
        }
      });
    }

    // Handle flags and timers and check if we are still chaining matches into more matches
    let chainMatchMade = false;
    let chainAlive = false;
    for (let i = blocks.length - 1; i >= 0; --i) {
      const block = blocks[i];

      if (!block.solid) {
        block.chaining = false;
      }

      if (block.floatTimer < 0 && block.flashTimer < 0 && !block.matching) {
        block.chaining = false;
      }

      chainAlive = (chainAlive || block.chaining);

      if (block.floatTimer > 0) {
        --block.floatTimer;
      }

      if (!--block.flashTimer) {
        clearBlock(block);
        block.chaining = true;
      }
      if (block.matching) {
        block.flashTimer = state.flashTime;
        if (block.chaining) {
          chainMatchMade = true;
        }
      }
      delete block.matching;
    }

    if (!chainAlive) {
      state.chainNumber = 0;
    }
    if (chainMatchMade) {
      state.chainNumber++;
    }

    return JSON.stringify(state);
  }

  function update(stateJSON) {
    const state = JSON.parse(stateJSON);
    const $container = $('#game_container');

    $container.empty();
    state.blocks.forEach((block, i) => {
      const $el = $('<div>').css({
        background: block.color,
        width: '20px',
        height: '20px',
        float: 'left',
      });

      if (!block.solid) {
        $el.css('background', 'transparent');
      }
      if (block.flashTimer >= 0) {
        $el.css('opacity', (block.flashTimer + 1) / (state.flashTime + 2));
      }

      if (block.floatTimer > 0) {
        $el.text('F');
      } else if (block.floatTimer === 0) {
        $el.text('f');
      }

      if (block.chaining) {
        $el.text(`${$el.text()}C`);
      }

      // Keyboard UI
      const swapperIndex = swapperX + (WIDTH * swapperY);
      if (i === swapperIndex || i === swapperIndex + 1) {
        $el.css({
          'border-style': 'solid',
          'box-sizing': 'border-box',
        });
      }

      // Mouse input
      $el.click((e) => {
        e.preventDefault();
        eventQueue.push([state.time, 'swap', i]);
      });

      $container.append($el);
      if (i % WIDTH === WIDTH - 1) {
        $container.append($('<div>').css({ clear: 'left' }));
      }
    });

    // Status info
    $container.append($('<p>', { text: `Chain number: ${state.chainNumber}` }));
    $container.append($('<p>', { text: `Time step: ${state.time}` }));
  }

  // Keyboard input
  $(window).keydown((e) => {
    switch (e.key) {
      case 'ArrowUp':
        if (swapperY > 0) {
          --swapperY;
        }
        break;

      case 'ArrowDown':
        if (swapperY < HEIGHT - 1) {
          ++swapperY;
        }
        break;

      case 'ArrowLeft':
        if (swapperX > 0) {
          --swapperX;
        }
        break;

      case 'ArrowRight':
        if (swapperX < WIDTH - 2) {
          ++swapperX;
        }
        break;

      case ' ':
        eventQueue.push([time, 'swap', swapperX + (WIDTH * swapperY)]);
        break;

      default:
        break;
    }
  });

  function Block(color, solid) {
    this.color = color;
    this.solid = solid;
    this.flashTimer = -1;
    this.floatTimer = -1;
    this.chaining = false;
  }

  const blocks = [];
  for (let i = 0; i < WIDTH * HEIGHT; ++i) {
    if (i % 5 === 0) {
      blocks.push(new Block('blue', true));
    } else if (i % 5 === 2) {
      blocks.push(new Block('green', true));
    } else if (i % 5 === 3 || i === 39) {
      blocks.push(new Block('', false));
    } else {
      blocks.push(new Block('red', true));
    }
  }

  let initialState = JSON.stringify({
    time: 0,
    flashTime: 3,
    floatTime: 2,
    chainNumber: 0,
    blocks,
  });

  function run() {
    const eventsByTime = {};
    let state = initialState;

    eventQueue.forEach((event) => {
      const events = eventsByTime[event[0]] || [];

      events.push(event);
      eventsByTime[event[0]] = events;
    });
    for (let instant = 0; instant < time; ++instant) {
      const events = eventsByTime[instant] || [];

      state = step(state, events);
    }
    ++time;
    update(state);
  }

  $('#reset').click(() => {
    time = 0;
  });

  $('#step').click(run);

  $('#back').click(() => {
    time -= 2;
    run();
  });

  const mainLoop = setInterval(run, 1000);

  $('#kill').click(() => {
    clearInterval(mainLoop);
  });

  $('#export_replay').click(() => {
    const dump = {
      state: initialState,
      events: eventQueue,
    };
    $('#export').val(btoa(JSON.stringify(dump)));
  });

  $('#import_replay').click(() => {
    const dump = JSON.parse(atob($('#export').val()));

    initialState = dump.state;
    eventQueue = dump.events;
  });

  // TODO: Multiplayer
  // http://socket.io/get-started/chat/
});
