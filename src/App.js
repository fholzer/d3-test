import React, { Component } from 'react';
import logo from './logo.svg';
import Chart from './charts/Chart';
import './App.css';

const MODES = [
    "value",
    "min",
    "max"
];

class App extends Component {

    onButtonClick = () => {
        this.mode = ((this.mode || 0) + 1) % 3
        this.chartLarge.setAccessors({ x: (d) => d.date, y: (d) => d[MODES[this.mode]]});
        this.chartSmall.setAccessors({ x: (d) => d.date, y: (d) => d[MODES[this.mode]]});
    }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={this.onButtonClick}>value/min/max</button>
        <Chart width="800" height="600" ref={(n) => this.chartLarge = n}/><br/>
        <Chart width="800" height="150" rings={false} grid={false} axisLeft={false} hover={false} ref={(n) => this.chartSmall = n}/><br/>
      </div>
    );
  }
}
export default App;
