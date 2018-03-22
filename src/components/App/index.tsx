import * as React from 'react';
import './style.css';
import Diagram from '../Diagram';
import Bar from '../Bar';
import * as io from 'socket.io-client';
import { DiagramModel } from 'storm-react-diagrams';

class App extends React.Component {
  socket = null;

  state = {
    engine: null,
    connectedUsers: []
  };

  /**
   * Pass along the diagram engine to other components
   * by calling this function in child components
   */
  setEngine = engine => {
    this.setState({ engine });
  };

  componentDidMount() {
    const host =
      process.env.NODE_ENV === 'production'
        ? 'https://workflow-websocket.sloppy.zone'
        : 'http://localhost:3001';
    this.socket = io(host)
      .on('datachange', data => {
        this.setDiagramModel(data);
      })
      .on('connectedUsers', connectedUsers => {
        this.setState({ connectedUsers });
      });

    // TODO very dirty hack to workaround missing events in storm-diagrams
    if (window) {
      const sendDataToServer = () => {
        setTimeout(() => {
          if (this.socket) {
            const newData = this.state.engine
              .getDiagramModel()
              .serializeDiagram();
            this.socket.emit('datachange', newData);
          }
        }, 10);
      };

      ['mouseup', 'keyup'].forEach(event =>
        window.addEventListener(event, sendDataToServer)
      );
    }
  }

  setDiagramModel(data) {
    const newModel = new DiagramModel();
    newModel.deSerializeDiagram(data, this.state.engine);

    /*
    // currently not needed because of hack
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
    */

    this.state.engine.setDiagramModel(newModel);
    this.state.engine.repaintCanvas();
  }

  render() {
    return (
      <div className="app" role="main">
        <Bar
          engine={this.state.engine}
          connectedUsers={this.state.connectedUsers}
        />
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
              <strong>Edit name</strong>: Double click node name to edit
            </li>
            <li>
              <strong>Delete</strong>: Select nodes and hit 'delete' on your
              keyboard
            </li>
            <li>
              <strong>Collaborate</strong>: Open this app in multiple
              browsers/tabs
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

export default App;
