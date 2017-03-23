/* eslint-env browser react */

import React from 'react';

import Game from './game.jsx';


class UserInterface extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // TODO
    };
  }

  componentDidMount() {
    const socket = window.io();

    this.socket = socket;

    socket.on('connected', (data) => {
      this.setState({
        game: JSON.parse(data.game),
        frameRate: data.frameRate,
      });
    });

    socket.on('client error', (data) => {
      window.alert(`Client side error:\n${data.message}`);
    });

    socket.on('clock', (data) => {
      // TODO: How to implement this with React?
    });

    socket.on('game list', (data) => {
      const game = data.games.find((game) => game.playerCount < game.maximumPlayerCount);

      if (game) {
        socket.emit('game join', { id: game.id });
      } else {
        socket.emit('game create', { mode: 'vs' });
      }
    });

    socket.emit('game list');
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.close();
      delete this.socket;
    }
  }

  render() {
    if (this.state.game) {
      return (<Game data={this.state.game} frameRate={this.state.frameRate}/>);
    }

    return (<h1>Waiting for an opponent to join&hellip;</h1>);
  }
}


export default UserInterface;
