/* eslint-env browser */

import { el } from 'redom';

import { dispatch } from './dispatch';

const puyoActionNames = {
  MovePieceLeft: 'Move left',
  MovePieceRight: 'Move right',
  Drop: 'Hard drop',
  RotateClockwise: 'Rotate clockwise',
  RotateCounterclockwise: 'Rotate counterclockwise',
};

const panelActionNames = {
  MoveSwapperDown: 'Move down',
  MoveSwapperUp: 'Move up',
  MoveSwapperLeft: 'Move left',
  MoveSwapperRight: 'Move right',
  Swap: 'Swap panels',
  AddRow: 'Add new row',
  // Refill and AddGarbage considered harmful
};

export default class Account {
  constructor(socket) {
    this.socket = socket;

    this.el = el('.account',
      this.puyoBindingsButton = el('button', { type: 'button' }, 'Set Puyo key bindings'),
      this.panelBindingsButton = el('button', { type: 'button' }, 'Set Panel League key bindings'),
      this.nextActionDisplay = el('.next-action')
    );

    this.puyoBindingsButton.onclick = (ev) => {
      ev.preventDefault();
      this.queryBindings(puyoActionNames, (keyBindings) => {
        dispatch(this, 'SetKeyBindings', { keyBindings, gameMode: 'puyo:duel' });
        dispatch(this, 'SetKeyBindings', { keyBindings, gameMode: 'puyo:endless' });
        this.nextActionDisplay.innerText = 'Key bindings saved for Puyo';
      });
    };

    this.panelBindingsButton.onclick = (ev) => {
      ev.preventDefault();
      this.queryBindings(panelActionNames, (keyBindings) => {
        dispatch(this, 'SetKeyBindings', { keyBindings, gameMode: 'panel-league:duel' });
        dispatch(this, 'SetKeyBindings', { keyBindings, gameMode: 'panel-league:sandbox' });
        this.nextActionDisplay.innerText = 'Key bindings saved for Panel League';
      });
    };
  }

  queryBindings(actionNames, callback) {
    const actions = Object.keys(actionNames);
    const bindings = {};
    const listener = ['keydown', (ev) => {
      const action = actions.shift();
      bindings[ev.key] = action;
    }];
    const waitForNextBinding = () => {
      if (actions.length) {
        this.nextActionDisplay.innerText = actionNames[actions[0]];
        window.setTimeout(waitForNextBinding, 100);
        return;
      }
      window.removeEventListener(...listener);
      callback(bindings);
    };

    window.addEventListener(...listener);
    waitForNextBinding();
  }
}
