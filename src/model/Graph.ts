//import * as UUID from 'uuid';
import { v4 as UUID } from 'uuid';
import {
    d3Types
} from 'graph-diagram';

export type GraphConnection = {
    type: string; // markup, neo4j
    url?: string;
    user?: string;
    password?: string;
}

export type GraphConfig = {
    initialCypher?: string;
    cyphers?: string[];
}

export type GraphData = {
    uuid: string;
    name: string;
    connection: GraphConnection;
    css: string;
    config: GraphConfig;
    d3Graph: d3Types.d3Graph;
}

export default class Graph {

    // public uuid: string;
    public name: string;
    public connection: GraphConnection;
    public scale: number;
    public css: string;
    public config: GraphConfig;
    public d3Graph: d3Types.d3Graph;

    constructor(connection?: any) {
        this.connection = connection;
    }

    initWithJson(json: any): Graph {
      // if (json.uuid) {
      //    this.uuid = json.uuid;
      // }
      this.name = json.name;
      this.connection = json.connection;
      this.scale = json.scale || 1.0;
      this.css = json.css;
      this.config = json.config;
      this.d3Graph = json.d3Graph;

      return this;
    }

    toJSON(): any {
        let json: any = {};
        // json.uuid = this.uuid;
        json.name = this.name;
        json.connection = this.connection;
        json.scale = this.scale || 1.0
        json.css = this.css;
        json.config = this.config;
        json.d3Graph =  this.d3Graph;

        return json;
    }
}
