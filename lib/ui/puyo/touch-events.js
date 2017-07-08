/* eslint-env browser */
import { dispatch } from '../dispatch';

function touchmove(ev) {
  ev.preventDefault();
  const el = document.elementFromPoint(ev.touches[0].clientX, ev.touches[0].clientY);

  if (el && el.classList.contains('piece-manipulator')) {
    this.x = el.dataset.x;
  }
}

function touchend(ev) {
  ev.preventDefault();
  let touches = ev.touches;

  if (!touches.length) {
    touches = ev.changedTouches;
  }
  if (touches.length) {
    const el = document.elementFromPoint(touches[0].clientX, touches[0].clientY);

    if (el && el.classList.contains('piece-manipulator') && el.classList.contains('release')) {
      this.x = el.dataset.x;
      dispatch(this, 'Drop');
    }
  } else {
    dispatch(this, 'Drop');
  }
}

module.exports = { touchmove, touchend };
