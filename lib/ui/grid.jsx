/* eslint-env browser react */

import React from 'react';

import Block from './block.jsx';


class Grid extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const rows = [];

    for (let y = 0; y < this.props.height; ++y) {
      const blocks = [];

      for (let x = 0; x < this.props.width; ++x) {
        blocks.push(<Block x={x} y={y}/>); // TODO: Read block properties from state
      }
      rows.push(<div className='row'>{blocks}</div>);
    }

    return (<div className='grid'>{rows}</div>);
  }
}


export default Grid;
