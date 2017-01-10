const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/dist/index.html`);
});

app.get('/asset/js/index.js', (req, res) => {
  res.sendFile(`${__dirname}/dist/asset/js/index.js`);
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.emit('connected', {
    game: mainGame,
    frameRate: frameRate,
    cache: mainGame.exportCache(),
  });
  socket.on('game event', (data) => {
    mainGame.addEvent(...data.event);
    socket.broadcast.emit('game event', data);
  });
});

const GameEngine = require('../../lib/engine');
const mainGame = new GameEngine();

function step() {
  mainGame.step();
  if (mainGame.time % 10 === 0) {
    io.emit('clock', {
      time: mainGame.time
    });
  }
}

const frameRate = 10;
const mainLoop = setInterval(step, 1000 / frameRate);

http.listen(3000, () => {
    console.log('Listening on port 3000');
});
