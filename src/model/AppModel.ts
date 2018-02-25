import path = require('path');
const findRoot = require('find-root');

import { EventEmitter } from "events";
import Neo4jController from '../neo4j/Neo4jController';

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';

export class AppModel extends EventEmitter {

    public neo4jController: Neo4jController;
    public graphData: any;
    public graphModel: Model;
    public activeNode: Node;
    public activeRelationship: Relationship;

    constructor() {
        super();
        this.neo4jController = new Neo4jController();
          this.neo4jController.getNodesAndRelationships()
              .then(data => {
                  this.graphData = data;
                  this.emit('ready', this);
              });
    }

    saveActiveNode(): void {
        let properties: any = this.activeNode.properties.toJSON();
        // this.activeNode.properties.list().forEach((propertyObj: any) => {
        //     properties[propertyObj.key] = propertyObj.value;
        // });
        console.log(properties);
        this.neo4jController.updateNodeWithIdAndProperties(Number(this.activeNode.id), properties)
            .then((response: any) => {
                console.log(response);
            });
    }

    saveActiveRelationship(): void {
        let properties: any = this.activeRelationship.properties.toJSON();
        // this.activeRelationship.properties.list().forEach((propertyObj: any) => {
        //     properties[propertyObj.key] = propertyObj.value;
        // });
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

    dispose(): void {
    }
}
