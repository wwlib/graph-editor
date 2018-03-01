import path = require('path');
const findRoot = require('find-root');
const pd = require('pretty-data').pd;

import {
    select
} from 'd3-selection';

import { EventEmitter } from "events";
import Neo4jController from '../neo4j/Neo4jController';
import AppSettings from './AppSettings';
import GraphSet from './GraphSet';
import Graph, { GraphConnection } from './Graph';

import {
  Model,
  ModelToCypher,
  ModelToD3,
  Markup,
  Node,
  Relationship
} from 'graph-diagram';

import Neo4jGraphConfig, { SavedCypher } from './Neo4jGraphConfig';

let testMarkup: string = `
<ul class="graph-diagram-markup" data-internal-scale="1" data-external-scale="1">
  <li class="node" data-node-id="0" data-x="672" data-y="193.5">
    <span class="caption">Food</span><dl class="properties"></dl></li>
  <li class="node" data-node-id="1" data-x="672" data-y="370.5">
    <span class="caption">Pizza</span><dl class="properties"><dt>name</dt><dd>Special</dd></dl></li>
  <li class="node" data-node-id="2" data-x="802" data-y="545.5">
    <span class="caption">Topping</span><dl class="properties"><dt>name</dt><dd>cheese</dd></dl></li>
  <li class="node" data-node-id="3" data-x="599" data-y="566.5">
    <span class="caption">Topping</span><dl class="properties"><dt>name</dt><dd>Pepperoni</dd></dl></li>
  <li class="node" data-node-id="4" data-x="439" data-y="449.5">
    <span class="caption">Topping</span><dl class="properties"><dt>name</dt><dd>sausage</dd></dl></li>
  <li class="node" data-node-id="50" data-x="894" data-y="391.5">
    <span class="caption">Crust</span><dl class="properties"><dt>name</dt><dd>Deep Dish</dd></dl></li>
  <li class="node" data-node-id="26" data-x="488" data-y="258.5">
    <span class="caption">User</span><dl class="properties"><dt>name</dt><dd>Michael</dd></dl></li>
  <li class="relationship" data-from="1" data-to="0">
    <span class="type">IS_A</span><dl class="properties"></dl></li>
  <li class="relationship" data-from="1" data-to="2">
    <span class="type">HAS</span><dl class="properties"></dl></li>
  <li class="relationship" data-from="1" data-to="3">
    <span class="type">HAS</span><dl class="properties"></dl></li>
  <li class="relationship" data-from="1" data-to="4">
    <span class="type">HAS</span><dl class="properties"></dl></li>
  <li class="relationship" data-from="26" data-to="1">
    <span class="type">LIKES</span><dl class="properties"></dl></li>
  <li class="relationship" data-from="1" data-to="50">
    <span class="type">HAS</span><dl class="properties"></dl></li>
</ul>
`;


export default class AppModel extends EventEmitter {

    public settings: AppSettings;
    public appSettingsData: any;
    public userDataPath: string;
    public graphSet: GraphSet;
    public neo4jController: Neo4jController;
    public graphData: any;
    public graphModel: Model;
    public activeGraph: Graph;
    public activeNode: Node;
    public activeRelationship: Relationship;
    public cypherStatus: string;

    constructor() {
        super();
        this.cypherStatus = '';
        this.settings = new AppSettings();
        this.settings.load((err: any, obj: any) => {
            if (err || !this.settings.data) {
                console.log(`AppModel: Settings not found. Using default.`);
                this.settings.data = {
                    userDataPath: "data/user"
                }
                this.initWithData(this.settings.data);
                this.saveSettings();
            } else {
                this.initWithData(this.settings.data);
            }

            this.graphSet = new GraphSet(this);
            this.graphSet.loadGraphNames()
                .then(() => {
                   this.initGraphWithName(this.graphSet.getGraphNames()[1]);
                });
        });
    }

    parseMarkup( markup: any )
    {
        var container: any = select( "body" ).append( "div" );
        container.node().innerHTML = markup;
        var model = Markup.parse( container.select("ul.graph-diagram-markup"));
        container.remove();
        return model;
    }

    initGraphWithName(name: string) {
        console.log(`initGraphWithName: ${name}`);
        let svgElement = document.getElementById('svgElement');
        let width: number = svgElement ? svgElement.clientWidth / 2 : 1280;
        let height: number = svgElement ? svgElement.clientHeight / 2 : 700;
        this.graphSet.loadGraphWithName(name)
            .then((graph:Graph) => {
                let connection: GraphConnection = graph.connection;
                switch(connection.type) {
                    case "file":
                        console.log("initGraphWithName: type: file");
                        break;
                    case "neo4j":
                        this.neo4jController = new Neo4jController(connection);
                        // this.neo4jController.getNodesAndRelationships(50)
                        console.log(`graph: `, graph);
                        graph.config = new Neo4jGraphConfig(graph.config);
                        this.neo4jController.getCypherAsD3(graph.config.initialCypher)
                            .then(data => {
                                this.graphData = data;
                                this.graphModel = ModelToD3.parseD3(this.graphData, null, {x: width, y: height});
                                this.activeNode = this.graphModel.nodeList()[0];
                                this.activeRelationship = this.graphModel.relationshipList()[0];
                                console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this.activeRelationship);
                                this.activeGraph = graph;
                                console.log(`activeGraph: `, graph);
                                this.emit('ready', this);
                            });
                        break;
                }
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
        this.appSettingsData = data;
        this.userDataPath = this.appSettingsData.userDataPath;
    }

    get json(): any {
        return this.appSettingsData;
    }

    saveSettings(): void {
        this.settings.data = this.json;
        this.settings.save((err: any) => {
            if (err) {
                console.log(`AppModel: Error saving settings: `, err);
            } else {
                console.log(`AppModel: Settings saved.`)
            }
        });
    }

    getMarkup(): string {
        var container: any = select( "body" ).append( "div" );
        Markup.format( this.graphModel, container );
        var markup: any = container.node().innerHTML;
        markup = markup
            .replace( /<li/g, "\n  <li" )
            .replace( /<span/g, "\n    <span" )
            .replace( /<\/span><\/li/g, "</span>\n  </li" )
            .replace( /<\/ul/, "\n</ul" );
        container.remove();
        return markup;
    }

    getCypher(): string {
        return ModelToCypher.convert(this.graphModel)
    }

    getD3(): string {
        return JSON.stringify(ModelToD3.convert(this.graphModel), null, 2);
    }

    getSVG(): string {
        let svg: any = select("#svgContainer svg");
        let firstg: any = svg.select("g")
            .attr("id", "firstg")
        var style = svg.insert("style", "#firstg");
        style.html(this.getCSS());

        let xml: any = select("#svgContainer svg").node();
        let rawSvg: any = new XMLSerializer().serializeToString(xml);
        let xml_pp = pd.xml(rawSvg);
        return xml_pp;
    }

    getCSS(): string {
        let graphEditorStyleSheet = document.getElementById('graph-editor-style');
        let styleData = graphEditorStyleSheet.innerHTML;
        let css_pp = pd.css(styleData)
        return css_pp;
    }

    getSavedCypherList(): any[] {
        console.log(`getSavedCypherList: `, this.activeGraph);
        let result: any[] = [];
        let neo4jGraphConfig: Neo4jGraphConfig;
        if (this.activeGraph && this.activeGraph.connection && this.activeGraph.connection.type == "neo4j") {
            let neo4jGraphConfig: Neo4jGraphConfig = this.activeGraph.config;
            result = neo4jGraphConfig.savedCyphersToArray();
        }
        return result;
    }

    saveSlectedCypher(savedCypher: SavedCypher): number {
        return 0
    }

    deleteSavedCypher(savedCypher: SavedCypher): number {
        return 0
    }

    executeCypher(string: string): void {

    }

    executeCypherWithIndex(index: number): void {

    }

    dispose(): void {
    }
}

/*
let tempGraphData: any = {
    name: "example-file",
    css: `body {
background-color: lightgrey;
}
`,
    connection: {
        "type": "file"
    },
    config: {
        data: {}
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
            this.graphSet.loadGraphWithName('example-file')
                .then((graph: Graph) => {
                    console.log(`graph loaded:`, graph);
                });
    });
*/
