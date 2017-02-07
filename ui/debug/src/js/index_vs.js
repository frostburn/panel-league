/* eslint-env browser, jquery */

const {GameEngine, NetworkGameEngine} = require('../../../../lib/engine');
const Grid = require('./grid');
let currentGame;
let step;

$(() => {
  if ('io' in window) {
    $('#player-container').text('Waiting for an opponent to join...');
    let waitTime = 0;
    const socket = io();

    socket.on('connected', (data) => {
      $('#player-container').empty();
      player = data.player;
      opponent = 1 - player;
      currentGame = NetworkGameEngine.unserialize(data.game);
      currentGame.installSocket(socket);
      init(player, opponent);
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
  }

  function init(player, opponent) {
    const $playerContainer = $('#player-container');
    const $opponentContainer = $('#opponent-container');
    if (typeof currentGame === 'undefined') {
      currentGame = new GameEngine({
        stepper: "panelLeagueVs",
        flashTime: 40,
        floatTime: 10,
        swapTime: 3,
        garbageFlashTime: 2,
        blockTypes: ['red', 'gold', 'lawngreen', 'darkcyan', 'blue', 'blueviolet'],
      });
    }
    const playerGrid = new Grid(currentGame, $playerContainer, player);
    const opponentGrid = new Grid(currentGame, $opponentContainer, ('io' in window) ? null : opponent);

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
            player: player,
            time: currentGame.time,
            type: 'swap',
            index: swapperX + (currentGame.width * swapperY)
          });
          break;

        case ' ':
          currentGame.addEvent({
            player: player,
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
      playerGrid.$blocks[index].css({
        'border-style': borderStyle,
        'box-sizing': 'border-box',
      });
      playerGrid.$blocks[index + 1].css({
        'border-style': borderStyle,
        'box-sizing': 'border-box',
      });
    }
    displaySwapper('solid');

    function update(state) {
      playerGrid.update(state.childStates[player]);
      opponentGrid.update(state.childStates[opponent]);
    }

    step = (() => {
      const state = currentGame.step();
      update(state);
    });
    if (!('io' in window)) {
      mainLoop = window.setInterval(step, 1000 / 30);
    }
  }

  if (!('io' in window)) {
    init(0, 1);
  }
});
