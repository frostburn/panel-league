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

  get name() {
    return 'panel-league-duel';
  }

  get maximumPlayerCount() {
    return 2;
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

  shouldStopGame(game) {
    return !game.playerCount;
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
    return 'sandbox';
  }

  get maximumPlayerCount() {
    return Number.MAX_VALUE;
  }

  shouldStartGame() {
    return true;
  }

  shouldStopGame() {
    return false;
  }
}


const gameModeFactory = ((name) => {
  switch (name) {
    case 'panel-league-duel':
      return new GameMode();
    case 'sandbox':
      return new SandboxMode();
    default:
      throw new Error(`Unrecognized game mode: ${name}`);
  }
});

module.exports = gameModeFactory;
