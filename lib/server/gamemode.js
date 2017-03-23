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
    return 'vs';
  }

  get maximumPlayerCount() {
    return 2;
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
    case 'vs':
      return new GameMode();
    case 'sandbox':
      return new SandboxMode();
    default:
      throw new Error(`Unrecognized game mode: ${name}`);
  }
});

module.exports = gameModeFactory;