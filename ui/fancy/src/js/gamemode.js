class GameMode {
  constructor(userInterface, game) {
    this.userInterface = userInterface;
    this.game = game;
  }

  install(container) {
    container.innerHTML = '';
    this.installDOMElements(container);
    this.installEventListeners();
  }

  installDOMElements(container) {
    // Overridden by subclasses.
  }

  installEventListeners() {
    // Overridden by subclasses.
  }
}

class VsGameMode extends GameMode {
  constructor(userInterface) {
    super(userInterface);
    this.playerGrid = null;
    this.opponentGrid = null;
  }

  installDOMElements(container) {
    // TODO
  }

  installEventListeners() {
    // TODO
  }
}

const gameModeClassMapping = {
  'vs': VsGameMode,
};

module.exports = function gameModeFactory(userInterface, game, name) {
  const gameModeClass = gameModeClassMapping[name];

  if (!gameModeClass) {
    throw new Error(`Unrecognized game mode: ${name}`);
  }

  return new gameModeClass(userInterface, game);
};
