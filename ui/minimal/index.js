const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(`${__dirname}/dist/index.html`);
});

app.get('/asset/js/index.js', function (req, res) {
  res.sendFile(`${__dirname}/dist/asset/js/index.js`);
});

io.on('connection', function(socket) {
    console.log('New client connected');

    socket.on('game event', function(data) {
        mainGame.addEvent(...data.event);
    });
});

const GameEngine = require('../../lib/engine');
const mainGame = new GameEngine();

function step() {
  state = mainGame.step();
  io.emit('update', {state});
}

const frameRate = 10;
mainLoop = setInterval(step, 1000 / frameRate);

http.listen(3000, function() {
    console.log('Listening on port 3000');
});
