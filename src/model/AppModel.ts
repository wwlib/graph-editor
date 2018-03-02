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

    constructor() {
        super();
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

    onUpdateActiveNode(event?: any): void {
        this.emit('updateActiveNode', this);
    }

    onUpdateActiveRelationship(event?: any): void {
        this.emit('updateActiveRelationship', this);
    }

    onRedraw(): void {
        this.emit('redrawGraph', this);
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

    executeCypher(cypher: string): void {
        console.log(`executeCypher: ${cypher}`);
        let svgElement = document.getElementById('svgElement');
        let width: number = svgElement ? svgElement.clientWidth / 2 : 1280;
        let height: number = svgElement ? svgElement.clientHeight / 2 : 700;
        this.neo4jController.getCypherAsD3(cypher)
            .then(data => {
                // this.graphData = data;
                // this.graphModel = ModelToD3.parseD3(this.graphData, null, {x: width, y: height});
                // this.activeNode = this.graphModel.nodeList()[0];
                // this.activeRelationship = this.graphModel.relationshipList()[0];
                // console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this.activeRelationship);
                // console.log(`activeGraph: `, this.activeGraph);
                this.emit('onCypherExecuted', data);
            })
            .catch((error: any) => {
                this.emit('onCypherExecutionError', error);
            })

    }

    executeCypherWithIndex(index: number): void {

    }

    addNode(x?: number, y?: number): Node {
        var svgElement = document.getElementById('svgElement');
        x = x || svgElement.clientWidth / 2;
        y = y || svgElement.clientHeight / 2;
        this.activeNode = this.graphModel.createNode();
        this.activeNode.x = x;
        this.activeNode.y = y;
        console.log(`addNode: `, this.activeNode);
        //this.save( formatMarkup() );
        this.onRedraw();
        return this.activeNode;
    }

    addRelationship(start: Node, end: Node): Relationship {
        return this.graphModel.createRelationship(start, end);
    }

    reverseActiveRelationship(): void {
        if (this.activeRelationship) {
            this.activeRelationship.reverse();
        }
    }

    deleteActiveNode()
    {
        if (this.activeNode) {
            this.graphModel.deleteNode(this.activeNode);
            // save( formatMarkup() );
            this.onRedraw();
        }
    }

    deleteActiveRelationship()
    {
        if (this.activeRelationship) {
            this.graphModel.deleteRelationship(this.activeRelationship);
            // save( formatMarkup() );
            this.onRedraw();
        }
    }

    dispose(): void {
    }
}
