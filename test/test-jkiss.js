const JKISS31 = require('../lib/jkiss');

module.exports.testSerialization = function (test) {
  const j = new JKISS31();
  j.scramble();
  const packet = j.serialize();
  const j_copy = JKISS31.unserialize(packet);
  test.expect(1000);
  for (let i = 0; i < 1000; ++i) {
    test.strictEqual(j.step(), j_copy.step(), 'Serialization desync');
  }
  test.done();
};

module.exports.testRange = function (test) {
  const j = new JKISS31();
  j.scramble();
  test.expect(2000);
  for (let i = 0; i < 1000; ++i) {
    const value = j.step();
    test.ok(value >= 0, 'Value too small');
    test.ok(value <= JKISS31.MAX_VALUE, 'Value too large');
  }
  test.done();
};

module.exports.testAverage = function (test) {
  const j = new JKISS31();
  // Must not scamble here to avoid rare nondeterministic failings
  let sum = 0;
  for (let i = 0; i < 10000; ++i) {
    sum += j.step() / JKISS31.MAX_VALUE;
  }
  test.expect(1);
  test.ok(Math.abs(sum - 5000) <= 100, 'Average deviates too much');
  test.done();
};

module.exports.testSeries = function (test) {
  const series = [
    2076818553,
    701481583,
    382548175,
    1253278281,
    1697481702,
    1374997215,
    94920131
  ];
  const j = new JKISS31();
  test.expect(series.length);
  for (let i = 0; i < series.length; ++i) {
    const value = j.step();
    test.strictEqual(value, series[i], 'Series not consistent across environments');
  }
  test.done();
};
