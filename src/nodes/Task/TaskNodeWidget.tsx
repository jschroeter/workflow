import * as React from 'react';
import { TaskNodeModel } from './TaskNodeModel';
import {
  PortWidget,
  DefaultLinkModel,
  DiagramEngine as engine
} from 'storm-react-diagrams';
import forEach from 'lodash/forEach';
import * as SRD from 'storm-react-diagrams';
import './task.css';
import * as icons from 'octicons';

export interface TaskNodeWidgetProps {
  node: TaskNodeModel;
  engine: engine;
}

export interface TaskNodeWidgetState {
  editMode: boolean;
  nodeName: string;
}

export class TaskNodeWidget extends React.Component<
  TaskNodeWidgetProps,
  TaskNodeWidgetState
> {
  public static defaultProps: TaskNodeWidgetProps = {
    engine: null,
    node: null
  };

  constructor(props: TaskNodeWidgetProps) {
    super(props);
    this.state = {
      editMode: false,
      nodeName: ''
    };
  }

  cloneSelected = () => {
    const offset = { x: 200, y: 0 };
    const model = this.props.engine.getDiagramModel();
    const newItem = this.props.node.clone({});
    newItem.level = this.props.node.level + 1;
    newItem.setIcon();

    if (newItem instanceof TaskNodeModel) {
      newItem.setPosition(newItem.x + offset.x, newItem.y + offset.y);
      newItem.selected = false;
      model.addNode(newItem);

      //Create new link
      const newLink = new DefaultLinkModel();
      newLink.setSourcePort(this.props.node.getPort('right'));
      const port = newItem.getPort('left');
      newLink.setTargetPort(port);

      // we need to wait until the element has been added
      window.setTimeout(() => {
        model.addLink(newLink);
        this.props.engine.repaintCanvas();
      }, 1);
    }
    this.forceUpdate();
    this.props.engine.repaintCanvas();
  };

  handleNameDoubleClick = () => {
    this.setState({
      editMode: true,
      nodeName: this.props.node.name
    });
  };

  handleNameChange = e => {
    this.setState({
      nodeName: e.target.value
    });
  };

  handleNameKeyUp = e => {
    // save on enter
    if (e.keyCode === 13) {
      this.handleNameBlur(e);
    }

    // prevent event bubbeling for backspace and delete keys, otherwise Node gets deleted
    if (e.keyCode === 8 || e.keyCode === 46) {
      e.stopPropagation();
    }
  };

  handleNameBlur = e => {
    this.props.node.name = e.target.value;
    this.setState({
      editMode: false
    });
  };

  render() {
    return (
      <div className={'task-node'}>
        <PortWidget name="left" node={this.props.node} />
        <PortWidget name="top" node={this.props.node} />
        <PortWidget name="right" node={this.props.node} />
        <PortWidget name="bottom" node={this.props.node} />
        <div className="title">
          {this.state.editMode ? (
            <input
              onChange={this.handleNameChange}
              onKeyUp={this.handleNameKeyUp}
              onBlur={this.handleNameBlur}
              value={this.state.nodeName}
              onFocus={input => input && input.target.select()}
              ref={input => input && input.focus()}
            />
          ) : (
            <span
              onDoubleClick={this.handleNameDoubleClick}
              title={this.props.node.name}
            >
              {this.props.node.name}
            </span>
          )}
          <span className="level">(Level {this.props.node.level})</span>
        </div>
        <svg
          viewBox="0 0 16 16"
          dangerouslySetInnerHTML={{
            __html: icons[this.props.node.icon].path
          }}
        />
        <a
          className="addButton"
          onClick={this.cloneSelected}
          aria-label="Hinzufügen"
        >
          <span role="presentation">+</span>
        </a>
      </div>
    );
  }
}
