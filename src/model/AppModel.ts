import path = require('path');
const findRoot = require('find-root');

import { EventEmitter } from "events";
import Neo4jController from '../neo4j/Neo4jController';
import Config from './Config';
import GraphSet from './GraphSet';
import Graph from './Graph';

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';

export default class AppModel extends EventEmitter {

    public config: Config;
    public appConfigData: any;
    public userDataPath: string;
    public graphSet: GraphSet;
    public neo4jController: Neo4jController;
    public graphData: any;
    public graphModel: Model;
    public activeNode: Node;
    public activeRelationship: Relationship;

    constructor() {
        super();
        this.config = new Config();
        this.config.load((err: any, obj: any) => {
            if (err || !this.config.data) {
                console.log(`AppModel: Config not found. Using default.`);
                this.config.data = {
                    userDataPath: "data/user"
                }
                this.initWithData(this.config.data);
                this.saveConfig();
            } else {
                this.initWithData(this.config.data);
            }

            this.graphSet = new GraphSet(this);
/*
            let tempGraphData: any = {
                name: "test1",
                css: `
text.caption {
  fill: #FFFFFF;
}

body {
  background-color: lightgrey;
}
                `,
                config: {
                    "type": "neo4j",
                    "url": "bolt://localhost:7687",
                    "user": "neo4j",
                    "password": "jibo"
                },
                d3Graph: {
                  "nodes": [{
                    "id": "50",
                    "labels": ["Pizza"],
                    "properties": {
                      "name": "Special"
                    },
                    "group": 1
                  }, {
                    "id": "9",
                    "labels": ["Topping"],
                    "properties": {
                      "name": "cheese"
                    },
                    "group": 1
                  }],
                  "links": []
                }
            }
            let tempGraph: Graph = new Graph();
            tempGraph.initWithJson(tempGraphData);
            this.graphSet.addGraph(tempGraph);
            this.graphSet.saveGraph(tempGraph)
                .then((graph: Graph) => {
                    console.log(`graph saved:`, graph);
                        this.graphSet.loadGraphWithUuid('36ad3c14-9bda-4540-83e2-b43fcd3b2b42')
                            .then((graph: Graph) => {
                                console.log(`graph loaded:`, graph);
                            });
                });
*/
            this.neo4jController = new Neo4jController();
              this.neo4jController.getNodesAndRelationships(100)
                  .then(data => {
                      this.graphData = data;
                      this.emit('ready', this);
                  });
        });
    }

    saveActiveNode(): void {
        let properties: any = this.activeNode.properties.toJSON();
        console.log(properties);
        this.neo4jController.updateNodeWithIdAndProperties(Number(this.activeNode.id), properties)
            .then((response: any) => {
                console.log(response);
            });
    }

    saveActiveRelationship(): void {
        let properties: any = this.activeRelationship.properties.toJSON();
        console.log(properties);
        this.neo4jController.updateRelationshipWithIdAndProperties(Number(this.activeRelationship.id), properties)
            .then((response: any) => {
                console.log(response);
            });
    }

    onUpdateData(event: any): void {
        this.emit('updateModel', this);
    }

    onUpdateActiveNode(event: any): void {
        this.emit('updateActiveNode', this);
    }

    onUpdateActiveRelationship(event: any): void {
        this.emit('updateActiveRelationship', this);
    }

    initWithData(data: any): void {
        this.appConfigData = data;
        this.userDataPath = this.appConfigData.userDataPath;
    }

    get json(): any {
        return this.appConfigData;
    }

    saveConfig(): void {
        this.config.data = this.json;
        this.config.save((err: any) => {
            if (err) {
                console.log(`AppModel: Error saving config: `, err);
            } else {
                console.log(`AppModel: Config saved.`)
            }
        });
    }

    dispose(): void {
    }
}
