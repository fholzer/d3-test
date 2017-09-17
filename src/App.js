import React, { Component } from 'react';
import logo from './logo.svg';
import Chart from './charts/Chart';
import './App.css';

class App extends Component {
    onButtonClick = () => {
        this.chart.setAccessors({ x: (d) => d.date, y: (d) => d.min});
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
        <button onClick={this.onButtonClick}/>
        <Chart width="800" height="600" ref={(n) => this.chart = n}/><br/>

      </div>
    );
  }
}
//<Chart width="800" height="600"/><br/>
export default App;
