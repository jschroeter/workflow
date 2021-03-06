import * as React from 'react';
import './style.css';
import { DiagramEngine, DiagramModel } from 'storm-react-diagrams';

export interface BarProps {
  engine: DiagramEngine;
  connectedUsers: Array<{ id: number; name: string; isActive: boolean }>;
}

export interface BarState {}

export class Bar extends React.Component<BarProps, BarState> {
  public static defaultProps: BarProps = {
    engine: null,
    connectedUsers: []
  };

  state = {
    showImportExport: false,
    text: ''
  };

  /**
   * Show and hide the import/export panel
   */
  toggleImportExport = () => {
    this.setState({ showImportExport: !this.state.showImportExport });
  };

  onTextChange = event => {
    this.setState({ text: event.target.value });
  };

  /**
   * Serialize diagram to export it
   */
  export = () => {
    const model = this.props.engine.getDiagramModel();

    if (model) {
      const str = JSON.stringify(model.serializeDiagram());
      this.setState({ text: str });
    }
  };

  /**
   * Import a serialized diagram (json)
   */
  import = () => {
    const newModel = new DiagramModel();
    newModel.deSerializeDiagram(JSON.parse(this.state.text), this.props.engine);
    this.props.engine.setDiagramModel(newModel);
    this.props.engine.repaintCanvas();
    this.setState({
      showImportExport: false,
      text: ''
    });
  };

  render() {
    return (
      <div className="bar">
        <ul className="activeUsers">
          {this.props.connectedUsers.map((user, index) => (
            <li key={index} className={user.isActive ? 'active' : ''}>
              👤 {user.name}
            </li>
          ))}
        </ul>
        <button
          className="importexport-toggle"
          onClick={this.toggleImportExport}
        >
          {this.state.showImportExport && 'Close'} Import / Export
        </button>
        {this.state.showImportExport && (
          <div className="importexport-panel">
            <textarea value={this.state.text} onChange={this.onTextChange} />
            <div className="actions">
              <button onClick={this.export}>Export</button>
              <button onClick={this.import}>Import</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Bar;
