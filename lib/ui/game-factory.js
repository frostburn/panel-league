import PanelLeagueDuelGame from './panel-league/game-duel';
import PanelLeagueSandboxGame from './panel-league/game-sandbox';

const gameMapping = {
  'panel-league-duel': PanelLeagueDuelGame,
  'panel-league-sandbox': PanelLeagueSandboxGame,
};


module.exports = function (gameModeName, socket) {
  const gameModeClass = gameMapping[gameModeName];

  if (!gameModeClass) {
    throw new Error(`Unrecognized game mode: ${gameModeName}`);
  }

  return new gameModeClass(socket);
};
