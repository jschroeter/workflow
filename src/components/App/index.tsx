import * as React from 'react';
import './style.css';
import Diagram from '../Diagram';
import Bar from '../Bar';
import * as io from 'socket.io-client';
import { DiagramModel } from 'storm-react-diagrams';

class App extends React.Component {
  socket = null;

  state = {
    engine: null
  };

  /**
   * Pass along the diagram engine to other components
   * by calling this function in child components
   */
  setEngine = engine => {
    this.setState({ engine });
  };

  componentDidMount() {
    this.socket = io('http://localhost:3001').on('datachange', data => {
      this.setDiagramModel(data);
    });
  }

  setDiagramModel(data) {
    const newModel = new DiagramModel();
    newModel.deSerializeDiagram(data, this.state.engine);

    newModel.addListener({
      nodesUpdated: () => {
        if (this.socket) {
          const newData = newModel.serializeDiagram();
          this.socket.emit('datachange', newData);
        }
      },
      linksUpdated: () => {
        if (this.socket) {
          const newData = newModel.serializeDiagram();
          this.socket.emit('datachange', newData);
        }
      }
    });

    this.state.engine.setDiagramModel(newModel);
    this.state.engine.repaintCanvas();
  }

  render() {
    return (
      <div className="app" role="main">
        <Bar engine={this.state.engine} />
        <Diagram setEngine={this.setEngine} />
        <div className="instructions">
          <h2>Usage</h2>
          <ul>
            <li>
              <strong>Zoom in and out</strong>: Use mousewheel
            </li>
            <li>
              <strong>Select</strong>: Click single nodes or links
            </li>
            <li>
              <strong>Select multiple</strong>: Hold shift and use mouse
            </li>
            <li>
              <strong>Delete</strong>: Select nodes and hit 'delete' on your
              keyboard
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

export default App;