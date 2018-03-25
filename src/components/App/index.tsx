import * as React from 'react';
import './style.css';
import Diagram from '../Diagram';
import Bar from '../Bar';
import * as io from 'socket.io-client';
import PouchDB from 'pouchdb';
import * as PouchDBupsert from 'pouchdb-upsert';
import PouchDBfind from 'pouchdb-find';
import { DiagramModel } from 'storm-react-diagrams';

class App extends React.Component {
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

  deleteNodeOrLinkById(id: string) {
    const node = this.state.engine.getDiagramModel().getNode(id);
    if (node) {
      node.remove();
    }
    const link = this.state.engine.getDiagramModel().getLink(id);
    if (link) {
      link.remove();
    }
  }

  upsertNode(node: any) {
    const diagramModel = this.state.engine.getDiagramModel();
    let nodeObj = diagramModel.getNode(node.id);
    // create node if it doesn't exist
    if (!nodeObj) {
      nodeObj = this.state.engine
        .getNodeFactory(node.type)
        .getNewInstance(node);
      nodeObj.setParent(diagramModel);
      nodeObj.deSerialize(node, this.state.engine);
      diagramModel.addNode(nodeObj);
    } else {
      // update some props of node
      nodeObj.icon = node.icon;
      nodeObj.name = node.name;
      nodeObj.level = node.level;
      nodeObj.setPosition(node.x, node.y);
    }
  }

  upsertLink(link: any) {
    const diagramModel = this.state.engine.getDiagramModel();
    let linkObj = diagramModel.getLink(link.id);
    // TODO HACK remove node if exists and create new one; better only update changes
    if (linkObj) {
      linkObj.remove();
    }

    linkObj = this.state.engine.getLinkFactory(link.type).getNewInstance(link);
    linkObj.setParent(diagramModel);
    linkObj.deSerialize(link, this.state.engine);
    diagramModel.addLink(linkObj);
  }

  registerSyncListeners(localDb: any) {
    const syncDataWithDB = (type, data) => {
      localDb
        .createIndex({
          index: {
            fields: ['type']
          }
        })
        .then(() => {
          // update or insert nodes/links in local DB
          data.forEach(node => {
            localDb
              .upsert(node.id, doc => {
                // only update if node has changed or wasn't saved before
                const hasChanged =
                  doc.data && JSON.stringify(node) !== JSON.stringify(doc.data);
                if (!doc.type || !doc.data || hasChanged) {
                  doc.type = type;
                  doc.data = node;
                  return doc;
                } else {
                  return false;
                }
              })
              .then(res => {
                // success, res is {rev: '1-xxx', updated: true, id: 'myDocId'}
              })
              .catch(err => {
                console.log(err);
              });
          });
        })
        .catch(err => {
          console.log(err);
        });
    };

    // TODO very dirty hack to workaround missing events in storm-diagrams
    if (window) {
      const sendDataToServer = () => {
        setTimeout(() => {
          console.log('sendDataToServer');
          const newData = this.state.engine
            .getDiagramModel()
            .serializeDiagram();

          syncDataWithDB('node', newData.nodes);
          syncDataWithDB('link', newData.links);
        }, 50);
      };

      ['mouseup', 'keyup'].forEach(event =>
        window.addEventListener(event, sendDataToServer)
      );
    }
  }

  componentDidMount() {
    PouchDB.plugin(PouchDBupsert);
    PouchDB.plugin(PouchDBfind);

    // create local db
    const localDb = new PouchDB('workflow');

    // sync initial state to diagram engine
    localDb
      .find({
        selector: { type: 'node' }
      })
      .then(responseNodes => {
        responseNodes.docs.forEach(doc => this.upsertNode(doc.data));
        localDb
          .find({
            selector: { type: 'link' }
          })
          .then(responseLinks => {
            responseLinks.docs.forEach(doc => this.upsertLink(doc.data));
            this.state.engine.repaintCanvas();
          });
      });

    // connect to remote db
    const remoteDb = new PouchDB('http://localhost:8080/workflow');
    // replicate local and remote db bidirectionally
    localDb
      .sync(remoteDb, {
        live: true,
        retry: true
      })
      .on('change', change => {
        console.log('change', change);
        change.change.docs.forEach(doc => {
          if (doc._deleted) {
            // document was deleted
            console.log('doc deleted', doc);
            this.deleteNodeOrLinkById(doc._id);
          } else if (doc.type && doc.data) {
            // document was added/modified
            switch (doc.type) {
              case 'node':
                console.log('node added/updated', doc);
                this.upsertNode(doc.data);
                break;
              case 'link':
                console.log('link added/updated', doc);
                this.upsertLink(doc.data);
                break;
            }
          }
        });

        this.state.engine.repaintCanvas();
      })
      .on('paused', info => {
        console.log('replication was paused', info);
      })
      .on('active', info => {
        console.log('replication was resumed', info);
      })
      .on('denied', info => {
        console.log('replication denied', info);
      })
      .on('complete', info => {
        console.log('replication complete', info);
      })
      .on('error', err => {
        // totally unhandled error (shouldn't happen)
        console.log('replication error');
      });

    // sync diagram changes to local db
    this.registerSyncListeners(localDb);

    /*
    // sync in diagram deleted nodes/links to local db
    this.state.engine.getDiagramModel().addListener({
      nodesUpdated: () => {
        this.syncDeletedWithDb(localDb, 'node');
      },
      linksUpdated: () => {
        this.syncDeletedWithDb(localDb, 'link');
      }
    });
    */
  }

  syncDeletedWithDb(localDb, type) {
    console.log('syncDeletedWithDb', type);

    const data = this.state.engine.getDiagramModel().serializeDiagram()[
      type + 's'
    ];

    // remove deleted nodes in local DB
    localDb
      .find({
        selector: { type }
      })
      .then(response => {
        const docsToDelete = response.docs.filter(
          doc => !data.some(node => node.id === doc._id)
        );
        docsToDelete.forEach(docToDelete => {
          localDb.remove(docToDelete).catch(err => {
            console.log(err);
          });
        });
      })
      .catch(err => {
        console.log(err);
      });
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
