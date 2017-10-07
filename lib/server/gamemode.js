const AbsoluteTimeControl = require('../common/timecontrol/absolute');
const { GameEngine } = require('../common/engine');
const PuyoExporter = require('../common/puyo/export');

class PuyoDuelTimeControl extends AbsoluteTimeControl {
  constructor() {
    const numPlayers = 2;
    const maxTime = 60;

    super({ numPlayers, maxTime });
  }

  makeMove(event) {
    if (event.type === 'addPuyos') {
      super.makeMove(event.player);
    }
  }

  step(engine) {
    this.players.map(player => player.index)
      .filter(player => !engine.callStepper('canPlay', { player }))
      .forEach(player => super.makeMove(player));
  }
}

class GameMode {
  get engineOptions() {
    return {
      stepper: 'panelLeagueVs',
      width: 6,
      height: 12,
      flashTime: 40,
      floatTime: 10,
      swapTime: 3,
      garbageFlashTime: 2,
      blockTypes: [
        'red',
        'green',
        'blue',
        'yellow',
        'violet',
        'navy',
      ],
    };
  }

  get timeControlClass() {
    return null;
  }

  get name() {
    return 'panel-league:duel';
  }

  get maximumPlayerCount() {
    return 2;
  }

  get frameRate() {
    return 30;
  }

  shouldStep(game) {
    return true;
  }

  shouldSendClock(game) {
    return (game.engine.time % 10 === 0);
  }

  shouldStartGame(game) {
    return game.playerCount === this.maximumPlayerCount;
  }

  shouldTerminateGame(game) {
    return game.playerCount < this.maximumPlayerCount;
  }

  shouldStopGame(game) {
    return !game.playerCount;
  }

  shouldRebase(game) {
    return false;
  }

  export(game) {
    return game.engine.serialize();
  }

  import(game, data) {
    game.engine = GameMode.unserialize(data);
  }
}


class SandboxMode extends GameMode {
  get engineOptions() {
    return {
      stepper: 'panelLeagueScoring',
      width: 12,
      height: 12,
      flashTime: 40,
      floatTime: 10,
      swapTime: 3,
      blockTypes: [
        'red',
        'green',
        'blue',
        'yellow',
        'violet',
        'navy',
      ],
    };
  }

  get name() {
    return 'panel-league:sandbox';
  }

  get maximumPlayerCount() {
    return Number.MAX_VALUE;
  }

  shouldStartGame() {
    return true;
  }

  shouldTerminateGame() {
    return false;
  }

  shouldStopGame() {
    return false;
  }

  shouldRebase(game) {
    return (game.engine.time % 600 === 0);
  }
}


class PuyoEndlessMode extends GameMode {
  get engineOptions() {
    return { stepper: 'puyo:endless' };
  }

  get name() {
    return 'puyo:endless';
  }

  get maximumPlayerCount() {
    return 1;
  }

  get frameRate() {
    return 3;
  }

  shouldStep(game) {
    return game.engine.callStepper('canStep');
  }

  shouldSendClock() {
    return true;
  }

  export(game) {
    return PuyoExporter.exportEndless(game.engine);
  }

  import(game, data) {
    game.engine = PuyoExporter.importEndless(data);
  }
}


class PuyoDuelMode extends GameMode {
  get engineOptions() {
    return { stepper: 'puyo:duel' };
  }

  get timeControlClass() {
    return PuyoDuelTimeControl;
  }

  get name() {
    return 'puyo:duel';
  }

  get maximumPlayerCount() {
    return 2;
  }

  get frameRate() {
    return 5;
  }

  shouldStep(game) {
    return game.engine.callStepper('canStep');
  }

  shouldSendClock() {
    return true;
  }

  export(game) {
    return PuyoExporter.exportDuel(game.engine);
  }

  import(game, data) {
    game.engine = PuyoExporter.importDuel(data);
  }
}

const gameModeFactory = ((name) => {
  switch (name) {
    case 'panel-league:duel':
      return new GameMode();
    case 'panel-league:sandbox':
      return new SandboxMode();
    case 'puyo:endless':
      return new PuyoEndlessMode();
    case 'puyo:duel':
      return new PuyoDuelMode();
    default:
      throw new Error(`Unrecognized game mode: ${name}`);
  }
});

module.exports = gameModeFactory;
