const JKISS31 = require("../jkiss");

function testSerialization() {
  const j = new JKISS31();
  j.scramble();
  const packet = j.serialize();
  const j_copy = JKISS31.unserialize(packet);
  for (let i = 0; i < 1000; ++i) {
    if (j.step() !== j_copy.step()) {
      throw new Error("Serialization desync");
    }
  }
}

function testRange() {
  const j = new JKISS31();
  j.scramble();
  for (let i = 0; i < 1000; ++i) {
    const value = j.step();
    if (value < 0) {
      throw new Error("Value too small");
    }
    if (value > JKISS31.MAX_VALUE) {
      throw new Error("Value too large");
    }
  }
}

function testAverage() {
  const j = new JKISS31();
  // Must not scamble here to avoid rare nondeterministic failings
  let sum = 0;
  for (let i = 0; i < 10000; ++i) {
    sum += j.step() / JKISS31.MAX_VALUE;
  }
  if (Math.abs(sum - 5000) > 100) {
    throw new Error("Average deviates too much");
  }
}

function testSeries() {
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
  for (let i = 0; i < series.length; ++i) {
    const value = j.step();
    if (value !== series[i]) {
      throw new Error("Series not consistent across environments");
    }
  }
}

testSerialization();
testRange();
testAverage();
testSeries();
