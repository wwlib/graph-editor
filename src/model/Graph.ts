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

    initWithJson(json?: any): Graph {
        json = json || {};
      this.name = json.name || '<filename>';
      this.connection = json.connection || {type: "file"};
      if (this.type == 'neo4j') {
          this.config = new Neo4jGraphConfig(json.config);
          this.connection.initialCypher = this.connection.initialCypher || Graph.DEFAULT_CYPHER;
      } else {
          this.config = json.config;
      }
      this.scale = json.scale || 1.0;
      this.css = json.css || `
      circle.node-base {
         fill: #FF756E;
         stroke: #E06760;
         stroke-width: 3px;
      }
       text.caption {
         fill: #FFFFFF;
      }
       body {
         background-color: lightgrey;
      }
       circle.node-type-Robot {
         fill: #BF85D6;
         stroke: #68BDF6;
         stroke-width: 3px;
      }
       circle.node-type-Animal {
         fill: #68BDF6;
         stroke: #5CA8DB;
         stroke-width: 3px;
      }
       circle.node-type-AnimalType {
         fill: #6DCE9E;
         stroke: #60B58B;
         stroke-width: 3px;
      }
       circle.node-type-Entity {
         fill: #FFD86E;
         stroke: #EDBA39;
      }
       circle.node-type-User {
         fill: #DE9BF9;
         stroke: #BF85D6;
         stroke-width: 3px;
      }
       circle.node.overlay:hover {
         fill: rgba(150, 150, 255, 0.5);
      }
       circle.node.ring:hover {
         stroke: rgba(150, 150, 255, 0.5);
      }
       path.relationship.overlay:hover {
         fill: rgba(150, 150, 255, 0.5);
         stroke: rgba(150, 150, 255, 0.5);
      }
`;
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
