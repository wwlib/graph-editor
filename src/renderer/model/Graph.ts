import {
    d3Types
} from 'graph-diagram';

import Neo4jGraphConfig from './Neo4jGraphConfig';

export type GraphConnection = {
    type: string; // markup, neo4j
    url: string;
    user: string;
    password: string;
    initialCypher: string;
}

export type GraphConfig = any;

export type GraphData = {
    name: string;
    connection: GraphConnection;
    scale: number
    css: string;
    config: GraphConfig | Neo4jGraphConfig;
    d3Graph: d3Types.d3Graph;
    markup?: string;
    dot?: string
}

export default class Graph {

    public static DEFAULT_CYPHER: string = "MATCH (n)-[r]-(p), (q) return n,r,p, q limit 100";

    public name: string = '';
    public connection: GraphConnection;
    public scale: number = 1.0;
    public css: string = '';
    public config: GraphConfig;
    public d3Graph: d3Types.d3Graph | undefined;
    public markup: string = '';
    public dot: string = '';

    constructor(connection?: any) {
        this.connection = connection;
    }

    initWithJson(json: any): Graph {
      this.name = json.name;
      this.connection = json.connection;
      if (this.type == 'neo4j') {
          this.config = new Neo4jGraphConfig(json.config);
          this.connection.initialCypher = this.connection.initialCypher || Graph.DEFAULT_CYPHER;
      } else {
          this.config = json.config;
      }
      this.scale = json.scale || 1.0;
      this.css = json.css;
      this.d3Graph = json.d3Graph;
      this.markup = json.markup;
      this.dot = json.dot;

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
        json.dot = this.dot;

        return json;
    }

    get type() {
        return this.connection.type;
    }
}
