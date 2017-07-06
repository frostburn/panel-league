import { el, list } from 'redom';

import { dispatch } from './dispatch';

const gameModeVerboseNames = {
  'puyo:duel': 'Puyo duel',
  'puyo:endless': 'Puyo endless',
  'panel-league-duel': 'Panel League duel',
  'panel-league-sandbox': 'Panel League sandbox',
};

const creatableGameModes = ['puyo:duel', 'puyo:endless'];

class GameInfo {
  constructor() {
    this.el = el('tr',
      this.gameModeDisplay = el('td'),
      this.metadataDisplay = el('td')
    );

    this.el.onclick = (ev) => {
      ev.preventDefault();
      this.el.classList.toggle('selected');
    };

    this.el.ondblclick = (ev) => {
      ev.preventDefault();
      if (!this.id) {
        return;
      }
      if (this.isJoinable) {
        dispatch(this, 'JoinGame', { id: this.id, mode: this.mode });
      } else {
        dispatch(this, 'SpectateGame', { id: this.id, mode: this.mode });
      }
    };
  }

  get isJoinable() {
    return this.playerCount < this.maximumPlayerCount;
  }

  update({ id, mode, playerCount, maximumPlayerCount, metadata }) {
    this.id = id;
    this.mode = mode;
    this.playerCount = playerCount;
    this.maximumPlayerCount = maximumPlayerCount;
    this.metadata = metadata;
    const maximumPlayerCountText = (maximumPlayerCount > 1000) ? '∞' : maximumPlayerCount;

    this.gameModeDisplay.innerText = `${gameModeVerboseNames[this.mode]}`;
    if (maximumPlayerCount > 2) {
      this.metadataDisplay.innerText = `${this.playerCount} / ${maximumPlayerCountText}`;
    } else {
      this.metadataDisplay.innerText = `${metadata.players.map(p => p.name).join(' vs ')}`;
    }
  }
}


export default class Lobby {
  constructor(socket) {
    this.socket = socket;

    const gameModeOptions = creatableGameModes.map(mode =>
      el('option', { value: mode }, gameModeVerboseNames[mode])
    );

    this.el = el('.lobby',
      el('',
        this.refreshButton = el('button', { type: 'button' }, 'Refresh'),
        this.createGameButton = el('button', { type: 'button' }, 'Create new game'),
        el('.select-container',
          this.gameModeSelect = el('select', gameModeOptions)
        ),
        el('',
          el('label', { for: 'nick' }, 'Nickname'),
          this.nickInput = el('input', { type: 'text', id: 'nick' })
        )
      ),
      el('table',
        el('thead',
          el('tr',
            el('th', 'Game mode'),
            el('th', 'Players')
          )
        ),
        this.games = list('tbody', GameInfo, 'id')
      )
    );

    this.refreshButton.onclick = (ev) => {
      ev.preventDefault();
      dispatch(this, 'RequestGameList');
    };

    this.createGameButton.onclick = (ev) => {
      ev.preventDefault();
      dispatch(this, 'CreateNewGame', { mode: this.gameModeSelect.value });
    };

    this.nickInput.onchange = this.nickInput.oninput = (ev) => {
      ev.preventDefault();
      dispatch(this, 'ChangeNick', { name: this.nickInput.value });
    };
  }

  onmount() {
    dispatch(this, 'RequestGameList');
  }

  onremount() {
    dispatch(this, 'RequestGameList');
  }

  update(games) {
    this.games.update(games);
  }

  updateNick(name) {
    this.nickInput.value = name;
  }
}
