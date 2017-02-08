const express = require('express');
const fs = require('fs');
const path = require('path');

const { SandboxGameServer, VsGameServer } = require('./lib/server');


function parseCommandLineArguments() {
  const parser = require('commander');
  const options = {
    host: null,
    port: 3000,
    userInterfacePath: path.join(__dirname, 'ui', 'debug', 'dist'),
    gameServer: VsGameServer,
  };

  parser
    .option('-h, --host <host>', 'Hostname to run the HTTPD on')
    .option('-p, --port <port>', 'TCP/IP port to run the HTTPD on')
    .option('-u, --user-interface <name>', 'name of the user interface to use')
    .option('-g, --game-mode <name>', 'name of the game mode to use')
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
  if (parser.userInterface) {
    const ui = path.join(__dirname, 'ui', parser.userInterface, 'dist');

    if (!fs.statSync(ui).isDirectory()) {
      process.stderr.write(`Unknown user interface: ${parser.userInterface}\n`);

      return null;
    }
    options.userInterfacePath = ui;
  }
  if (parser.gameMode === 'sandbox') {
    options.gameServer = SandboxGameServer;
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
      const gameServer = new options.gameServer();

      app.use(express.static(options.userInterfacePath));
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
