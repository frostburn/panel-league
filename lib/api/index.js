const { NetworkGameEngine } = require('../common/engine');
const createAdapterPair = require('./socket-adapter');

class APIGame {
  constructor(adapter) {
    this.adapter = adapter;

    this.adapter.on('client error', (data) => {
      process.stdout.write(`Client side error:\n${data.message}\n`);
    });

    this.adapter.on('connected', (data) => {
      this.player = data.player;
      this.engine = NetworkGameEngine.unserialize(data.game);
      this.engine.installSocket(this.adapter);
    });

    this.adapter.on('clock', (data) => {
      const serverTime = data.time;

      if (!this.engine) {
        return;
      }
      while (this.engine.time < serverTime) {
        this.engine.step();
      }
    });
  }

  createGame(args) {
    this.adapter.emit('game create', args);
  }

  joinGame(args) {
    this.adapter.emit('game join', args);
  }
}

class API {
  constructor(server) {
    this.server = server;
    this.adapters = {};
    this.games = {};
  }

  createGame() {
    const [adapter1, adapter2] = createAdapterPair();
    const uuid = adapter2.uuid;

    this.server.addConnection(adapter1);
    this.adapters[uuid] = adapter2;
    this.games[uuid] = new APIGame(adapter2);

    return this.games[uuid];
  }

  getState(uuid) {
    const game = this.games[uuid];
    const engine = game.engine;
    if (engine) {
      const state = engine.currentState;
      const canPlay = engine.callStepper('canPlay', { player: game.player });

      // The RNG state must not be leaked.
      // Reversing the RNG state should be made hard by supporting entropy mixing events.
      delete state.RNG;
      state.canPlay = canPlay;
      state.player = game.player;

      return state;
    }
    return { canPlay: false };
  }

  addEvent(uuid, data) {
    const engine = this.games[uuid].engine;
    if (engine) {
      engine.addEvent(data);
      return { success: true };
    }
    return { success: false };
  }
}

function installAPI(app, server) {
  const api = new API(server);

  app.get('/api/game/list', (req, res) => {
    let list = api.server.getGames();

    if (req.query.mode) {
      list = list.filter(game => game.mode === req.query.mode);
    }
    if (req.query.status === 'open') {
      list = list.filter(game => game.playerCount < game.maximumPlayerCount);
    }
    res.send(JSON.stringify({ games: list }));
  });

  app.get('/api/game/view/:id/', (req, res) => {
    const state = api.server.games[req.params.id].engine.currentState;

    delete state.RNG;
    res.send(JSON.stringify(state));
  });

  app.post('/api/game/create', (req, res) => {
    const apiGame = api.createGame();

    apiGame.createGame(req.body);
    res.send(JSON.stringify({ id: apiGame.adapter.uuid }));
  });

  app.post('/api/game/join', (req, res) => {
    const apiGame = api.createGame();
    apiGame.joinGame(req.body);

    res.send(JSON.stringify({ id: apiGame.adapter.uuid }));
  });

  app.get('/api/play/:adapter/', (req, res) => {
    const state = api.getState(req.params.adapter);
    if (req.query.poll && !state.canPlay) {
      res.send(JSON.stringify({ canPlay: false }));
    } else {
      res.send(JSON.stringify(state));
    }
  });

  app.post('/api/play/:adapter/', (req, res) => {
    const response = api.addEvent(req.params.adapter, req.body);

    res.send(JSON.stringify(response));
  });

  app.delete('/api/play/:adapter/', (req, res) => {
    api.adapters[req.params.adapter].emit('disconnect');
    res.send(JSON.stringify({ success: true }));
  });

  return api;
}

module.exports = installAPI;
