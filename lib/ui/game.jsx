/* eslint-env react browser */

import React from 'react';

import Grid from './grid';


class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isRunning: true,
      waitTime: 0,
    };
  }

  componentDidMount() {
    this.interval = window.setInterval(() => {
      if (this.state.isRunning) {
        // TODO: Find out what is wait time and how to use it in React.
      } else {
        window.clearInterval(this.interval);
        delete this.interval;
      }
    }, 1000 / this.props.frameRate);
  }

  componentWillUnmount() {
    if (this.interval) {
      window.clearInterval(this.interval);
      delete this.interval;
    }
  }

  render() {
    return (<Grid width={this.props.data.width} height={this.props.data.height}/>);
  }
}


export default Game;
