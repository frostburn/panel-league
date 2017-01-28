const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const {GameEngine} = require('../../lib/engine');

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/dist/index_vs.html`);
});

app.get('/asset/js/index_vs.js', (req, res) => {
  res.sendFile(`${__dirname}/dist/asset/js/index_vs.js`);
});

io.on('connection', (socket) => {
  console.log('New client connected');

  if (!pendingPlayer) {
    pendingPlayer = socket;
  }
  else {
    console.log('New game starting');
    const game = new GameEngine({
      stepper: 'panelLeagueVs',
      flashTime: 40,
      floatTime: 10,
      swapTime: 3,
      garbageFlashTime: 2,
      blockTypes: ['red', 'gold', 'lawngreen', 'darkcyan', 'blue', 'blueviolet'],
    });
    games.push(game);
    pendingPlayer.game = game;
    socket.game = game;
    pendingPlayer.opponent = socket;
    socket.opponent = pendingPlayer;
    const data = {
      player: 0,
      game: game.serialize(),
      frameRate: frameRate,
      cache: game.exportCache(),
    }
    pendingPlayer.emit('connected', data);
    data.player = 1;
    socket.emit('connected', data);
    game.players = [pendingPlayer, socket];
    pendingPlayer = null;
  }
  socket.on('game event', (data) => {
    socket.game.addEvent(data.event);
    socket.opponent.emit('game event', data);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const games = [];
let pendingPlayer = null;

function step() {
  games.forEach((game) => {
    game.step();
    if (game.time % 10 === 0) {
      game.players.forEach((player) => {
        player.emit('clock', {
          time: game.time
        });
      });
    }
  });
}

const frameRate = 30;
const mainLoop = setInterval(step, 1000 / frameRate);

http.listen(3000, () => {
    console.log('Listening on port 3000');
});
