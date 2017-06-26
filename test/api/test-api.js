const GameServer = require('../../lib/server');
const installAPI = require('../../lib/api');

class FakeApp {
  constructor() {
    this.GET = {};
    this.POST = {};
    this.DELETE = {};
  }

  get(endpoint, callback) {
    this.GET[endpoint] = callback;
  }

  post(endpoint, callback) {
    this.POST[endpoint] = callback;
  }

  delete(endpoint, callback) {
    this.DELETE[endpoint] = callback;
  }

  dispatch(endpoint, method, args) {
    this[method][endpoint](...args);
  }
}

class FakeRequest {
  constructor(arg = {}) {
    this.params = arg.params || {};
    this.body = arg.body || {};
    this.query = arg.query || {};
  }
}

module.exports.testFlow = function (test) {
  const app = new FakeApp();
  const server = new GameServer();
  const api = installAPI(app, server);
  let req;
  let res;
  let playId;
  let otherId;
  let gameId;

  test.expect(9);

  req = new FakeRequest();
  res = {
    send: (result) => {
      test.strictEqual(result, JSON.stringify({ games: [] }), 'Existing games found');
    },
  };
  app.dispatch('/api/game/list', 'GET', [req, res]);


  req = new FakeRequest({ body: { mode: 'puyo:duel' } });
  res = {
    send: (result) => {
      playId = JSON.parse(result).id;
      test.ok(playId, 'Play ID could not be parsed');
    },
  };
  app.dispatch('/api/game/create', 'POST', [req, res]);

  req = new FakeRequest();
  res = {
    send: (result) => {
      gameId = JSON.parse(result).games[0].id;
      test.ok(gameId, 'Game ID could not be parsed');
    },
  };
  app.dispatch('/api/game/list', 'GET', [req, res]);

  req = new FakeRequest({ body: { id: gameId } });
  res = {
    send: (result) => {
      otherId = JSON.parse(result).id;
      test.ok(otherId, 'Play ID could not be parsed');
    },
  };
  app.dispatch('/api/game/join', 'POST', [req, res]);

  req = new FakeRequest({ params: { adapter: playId } });
  res = {
    send: (result) => {
      test.strictEqual(JSON.parse(result).time, 0, 'Game not at initial state');
    },
  };
  app.dispatch('/api/play/:adapter/', 'GET', [req, res]);

  req = new FakeRequest({
    params: { adapter: playId },
    body: { type: 'addPuyos', blocks: [1, 0, 0, 0, 0, 2] },
  });
  res = {
    send: (result) => {
      result = JSON.parse(result);
      test.ok(!result.success, 'Bogus move accepted as valid');
      test.ok(result.reason);
    },
  };
  app.dispatch('/api/play/:adapter/', 'POST', [req, res]);

  req = new FakeRequest({ params: { adapter: playId } });
  res = {
    send: (result) => {
      test.ok(JSON.parse(result).success, 'Could not close connection');
    },
  };
  app.dispatch('/api/play/:adapter/', 'DELETE', [req, res]);
  req.params.adapter = otherId;
  app.dispatch('/api/play/:adapter/', 'DELETE', [req, res]);

  test.done();
};
