const AbsoluteTimeControl = require('./absolute');

function timeControlFactory(data) {
  let instance;

  if (data.type === 'absolute') {
    instance = new AbsoluteTimeControl(data);
  } else {
    throw new Error('Unknown time control type');
  }
  instance.players = data.players;

  return instance;
}

module.exports = timeControlFactory;
