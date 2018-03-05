import {
    d3Types
} from 'graph-diagram';

import Neo4jGraphConfig from './Neo4jGraphConfig';

export type GraphConnection = {
    type: string; // markup, neo4j
    url?: string;
    user?: string;
    password?: string;
}

export type GraphConfig = any;

export type GraphData = {
    name: string;
    connection: GraphConnection;
    type: string;
    scale: number
    css: string;
    config: GraphConfig | Neo4jGraphConfig;
    d3Graph: d3Types.d3Graph;
    markup?: string
}

export default class Graph {

    public type: string;
    public name: string;
    public connection: GraphConnection;
    public scale: number;
    public css: string;
    public config: GraphConfig;
    public d3Graph: d3Types.d3Graph;
    public markup: string;

    constructor(connection?: any) {
        this.connection = connection;
    }

    initWithJson(json: any): Graph {
      this.name = json.name;
      this.connection = json.connection;
      this.type = this.connection.type;
      if (this.type == 'neo4j') {
          this.config = new Neo4jGraphConfig(json.config)
      } else {
          this.config = json.config;
      }
      this.scale = json.scale || 1.0;
      this.css = json.css;
      this.d3Graph = json.d3Graph;
      this.markup = json.markup;

      return this;
    }

    toJSON(): any {
        let json: any = {};
        json.name = this.name;
        json.connection = this.connection;
        json.type = this.connection.type;
        json.scale = this.scale || 1.0
        json.css = this.css;
        json.config = this.config;
        json.d3Graph =  this.d3Graph;
        json.markup = this.markup;

        return json;
    }
}
