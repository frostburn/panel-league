const createAdapterPair = require('../lib/api/socket-adapter');
const AbsoluteTimeControl = require('../lib/common/timecontrol/absolute');
const timeControlFactory = require('../lib/common/timecontrol/factory');

module.exports.testAbsolute = function (test) {
  const [serverSocket, clientSocket] = createAdapterPair();
  const [another, pair] = createAdapterPair();
  const serverSide = new AbsoluteTimeControl({
    maxTime: 3,
    numPlayers: 2,
  });
  const data = serverSide.export();
  const clientSide = timeControlFactory(data);
  const anotherClient = timeControlFactory(data);

  serverSide.addSocket(serverSocket);
  clientSide.addSocket(clientSocket);
  serverSide.addSocket(another);
  anotherClient.addSocket(pair);

  serverSide.on('tick', () => test.ok(true));
  serverSide.on('makeMove', (index) => {
    test.strictEqual(index, 1);
    test.strictEqual(serverSide.players[0].timeRemaining, 2);
    test.strictEqual(serverSide.players[1].timeRemaining, 3);
    test.ok(serverSide.players[0].waiting);
    test.ok(!serverSide.players[1].waiting);
  });
  serverSide.on('gameOver', losers => test.deepEqual(losers, [0]));
  clientSide.on('gameOver', losers => test.deepEqual(losers, [0]));
  anotherClient.on('gameOver', losers => test.deepEqual(losers, [0]));

  test.expect(11);
  test.strictEqual(clientSide.maxTime, 3);
  serverSide.tick();
  clientSide.makeMove(1);
  serverSide.tick();
  serverSide.tick();

  test.done();
};
