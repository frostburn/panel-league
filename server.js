const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const GameServer = require('./lib/server');
const SessionHandler = require('./lib/server/session');
const sessionCookieMiddleware = require('./lib/server/session/middleware');
const Game = require('./lib/server/game');
const gameModeFactory = require('./lib/server/gamemode');
const installAPI = require('./lib/api');


function parseCommandLineArguments() {
  const parser = require('commander');
  const options = {
    host: null,
    port: 3000,
    debug: false,
  };

  parser
    .option('-h, --host <host>', 'Hostname to run the HTTPD on')
    .option('-p, --port <port>', 'TCP/IP port to run the HTTPD on')
    .option('-d, --debug', 'Launch server in debug/development mode')
    .option('--redis-url <url>', 'URL of the Redis server')
    .option('--redis-path <sock>', 'The UNIX socket string of the Redis server')
    .option('--no-redis', 'Fall back to in-memory storage')
    .parse(process.argv);

  if (parser.host) {
    options.host = parser.host;
  }
  if (parser.port) {
    const port = parseInt(parser.port, 10);

    if (isNaN(port)) {
      process.stderr.write(`Invalid HTTPD port: ${parser.port}\n`);

      return null;
    }
    options.port = port;
  }
  if (parser.debug) {
    options.debug = true;
  }

  if (parser.redis === false) {
    options.noRedis = true;
  }
  if (parser.redisUrl) {
    options.redisUrl = parser.redisUrl;
  }
  if (parser.redisPath) {
    options.redisPath = parser.redisPath;
  }

  return options;
}

function launchServer(options) {
  const app = express();
  const httpServer = require('http').Server(app);
  const webSocketServer = require('socket.io')(httpServer);

  httpServer.listen(
    {
      host: options.host,
      port: options.port
    },
    () => {
      const address = httpServer.address();
      const gameServer = new GameServer();
      const sessionHandler = new SessionHandler({
        url: options.redisUrl,
        path: options.redisPath,
      }, options.noRedis);

      app.use(cookieParser());
      app.use(sessionCookieMiddleware());

      if (options.debug) {
        const webpack = require('webpack');
        const webpackDevMiddleware = require('webpack-dev-middleware');
        const webpackHotMiddleware = require('webpack-hot-middleware');
        const webpackConfig = require('./webpack.dev.config');
        const compiler = webpack(webpackConfig);

        app.use(webpackDevMiddleware(
          compiler,
          {
            publicPath: webpackConfig.output.publicPath,
            stats: {
              colors: true,
            },
          }
        ));
        app.use(webpackHotMiddleware(compiler, {
          log: console.log,
        }));
        app.get('/', (req, res) => {
          res.send(fs.readFileSync('./public/index.html').toString());
        });
      } else {
        app.use(express.static(path.join(__dirname, 'public')));
      }

      app.use(bodyParser.json());
      const api = installAPI(app, gameServer);  // Value stored for reference counting only.

      webSocketServer.on('connection', (socket) => {
        gameServer.addConnection(socket);
        sessionHandler.addConnection(socket);
      });
      process.stdout.write(`Server running at http://${address.address}:${address.port}\n`);

      const defaultPanelLeagueSandbox = new Game(gameServer, gameModeFactory('panel-league-sandbox'));
      gameServer.games[defaultPanelLeagueSandbox.id] = defaultPanelLeagueSandbox;
      process.stdout.write(`Sandbox game ${defaultPanelLeagueSandbox.id} created\n`);
    }
  );
}

if (require.main === module) {
  const options = parseCommandLineArguments();

  if (!options) {
    process.exit(1);
  }
  launchServer(options);
}
