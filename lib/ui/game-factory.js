import PanelLeagueDuelGame from './panel-league/game-duel';
import PanelLeagueSandboxGame from './panel-league/game-sandbox';
import PuyoDuelGame from './puyo/game-duel';
import PuyoEndlessGame from './puyo/game-endless';

const gameMapping = {
  'panel-league:duel': PanelLeagueDuelGame,
  'panel-league:sandbox': PanelLeagueSandboxGame,
  'puyo:duel': PuyoDuelGame,
  'puyo:endless': PuyoEndlessGame,
};

module.exports = function (gameModeName, keyBindings) {
  const gameModeClass = gameMapping[gameModeName];

  if (!gameModeClass) {
    throw new Error(`Unrecognized game mode: ${gameModeName}`);
  }

  return new gameModeClass({ keyBindings });
};
