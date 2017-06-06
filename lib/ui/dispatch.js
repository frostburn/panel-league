/* eslint-env browser */

import isFunction from 'lodash/isFunction';


export const dispatch = (view, type, data = {}) => {
  const el = view.el || view;

  el.dispatchEvent(new CustomEvent('panel-league-action', {
    detail: {
      type, data
    },
    bubbles: true,
  }));
};


export const listen = (view) => {
  const el = view.el || view;

  el.addEventListener('panel-league-action', ev => {
    const { type, data } = ev.detail;
    const handler = view[`on${type}`];

    if (isFunction(handler)) {
      handler.call(view, data);
    }
  });
};
