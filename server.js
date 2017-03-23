const express = require('express');
const fs = require('fs');
const path = require('path');

const GameServer = require('./lib/server');


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
    .parse(process.argv);

  if (parser.host) {
    options.host = parser.host;
  }
  if (parser.port) {
    const port = parseInt(parser.port);

    if (isNaN(port)) {
      process.stderr.write(`Invalid HTTPD port: ${parser.port}\n`);

      return null;
    }
    options.port = port;
  }
  if (parser.debug) {
    options.debug = true;
  }

  return options;
}

function launchServer(options) {
  const express = require('express');
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
      webSocketServer.on('connection', (socket) => {
        gameServer.addConnection(socket);
      });
      gameServer.run();
      process.stdout.write(`Server running at http://${address.address}:${address.port}\n`);
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
