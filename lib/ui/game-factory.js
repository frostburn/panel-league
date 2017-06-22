import PanelLeagueDuelGame from './panel-league/game-duel';


const gameMapping = {
  'panel-league-duel': PanelLeagueDuelGame,
};


module.exports = function (gameModeName, socket) {
  const gameModeClass = gameMapping[gameModeName];

  if (!gameModeClass) {
    throw new Error(`Unrecognized game mode: ${gameModeName}`);
  }

  return new gameModeClass(socket);
};
