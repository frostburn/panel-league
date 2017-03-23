/* eslint-env browser react */

import React from 'react';


class Block extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const classList = [];

    if (this.props.color) {
      classList.push(this.state.color);
    }
    if (this.props.isGarbagePreview) {
      classList.push('garbage-preview');
    }
    if (this.props.isFlashing) {
      classList.push('flashing');
    }

    return (<div className={classList.join(' ')}></div>);
  }
}


export default Block;
