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

    private _activeNode: Node;
    private _activeRelationship: Relationship;
    private _newNode: Node;
    private _newRelationship: Relationship;

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
                                this._activeRelationship = this.graphModel.relationshipList()[0];
                                console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this._activeRelationship);
                                this.activeGraph = graph;
                                console.log(`activeGraph: `, graph);
                                this.emit('ready', this);
                            });
                        break;
                }
            });
    }

    saveActiveNode(oldLabel?: string): void {
        // let properties: any = this.activeNode.properties.toJSON();
        // console.log(properties);
        this.neo4jController.updateNode(this._activeNode, oldLabel)
            .then((response: any) => {
                console.log(response);
            });
    }

    saveActiveRelationship(): void {
        // let properties: any = this._activeRelationship.properties.toJSON();
        // console.log(properties);
        this.neo4jController.updateRelationship(this._activeRelationship)
            .then((response: any) => {
                console.log(response);
            });
    }

    reverseActiveRelationship(): void {
        if (this._activeRelationship) {
            if (this.activeGraph.type == "neo4j") {
                this.neo4jController.reverseRelationship(this._activeRelationship)
                    .then((result: any) => {
                        console.log(result);
                        this._activeRelationship.reverse();
                        this.onRedraw();
                    })
                    .catch((error: any) => {
                        console.log(error);
                    })
            } else {
                this._activeRelationship.reverse();
                this.onRedraw();
            }
        }
    }

    onUpdateData(event: any): void {
        this.emit('updateModel', this);
    }

    onUpdateActiveNode(event?: any): void {
        let data: any = {
            label: this.getActiveNodeLabel(),
            properties: this.getActiveNodePropertiesAsText()
        }
        this.emit('updateActiveNode', data);
    }

    onUpdateActiveRelationship(event?: any): void {
        let data: any = {
            label: this.getActiveRelationshipLabel(),
            properties: this.getActiveRelationshipPropertiesAsText()
        }
        this.emit('updateActiveRelationship', data);
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
        // console.log(`getSavedCypherList: `, this.activeGraph);
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
                // this._activeRelationship = this.graphModel.relationshipList()[0];
                // console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this._activeRelationship);
                // console.log(`activeGraph: `, this.activeGraph);
                this.emit('onCypherExecuted', data);
            })
            .catch((error: any) => {
                this.emit('onCypherExecutionError', error);
            })

    }

    executeCypherWithIndex(index: number): void {

    }

    set activeNode(node: Node) {
        this._activeNode = node;
        this.onUpdateActiveNode();
    }

    get activeNode(): Node {
        return this._activeNode;
    }

    set newNode(node: Node) {
        this._newNode = node;
    }

    get newNode(): Node {
        return this._newNode;
    }

    onDragRing(__data__:any, event: any): void {
        var node: Node = __data__.model as Node;
        if ( !this._newNode )
        {
            this._newNode = this.addLocalNode(event.x, event.y);
            this._newRelationship = this.addLocalRelationship( node, this._newNode );
        }
        var connectionNode = this.findClosestOverlappingNode( this._newNode );
        if ( connectionNode )
        {
            this._newRelationship.end = connectionNode
        } else
        {
            this._newRelationship.end = this._newNode;
        }
        this._newNode.drag(event.dx, event.dy);
    }

    async onDragEnd() {
        console.log(`AppModel: onDragEnd`, this._newNode, this._newRelationship);
        if ( this._newNode )
        {
            this._newNode.dragEnd();
            if ( this._newRelationship && this._newRelationship.end !== this._newNode )
            {
                this.deleteLocalNode( this._newNode );
            } else {
                if (this.activeGraph.type == "neo4j") {
                    // corresponding new node in neo4j
                    let nodeResult: any = await this.neo4jController.addNode(this._newNode);
                    console.log(nodeResult);
                }
            }
            if (this.activeGraph.type == "neo4j") {
                //create corresponding new relationship in neo4j
                let relationshipResult: any = await this.neo4jController.addRelationship(this._newRelationship);
                console.log(relationshipResult);
            }
        }

        this._newNode = null;
        this._newRelationship = null;
    }

    findClosestOverlappingNode( node: Node )
    {
        var closestNode = null;
        var closestDistance = Number.MAX_VALUE;

        var allNodes = this.graphModel.nodeList();

        for ( var i = 0; i < allNodes.length; i++ )
        {
            var candidateNode = allNodes[i];
            if ( candidateNode !== node )
            {
                var candidateDistance = node.distanceTo( candidateNode ) * this.graphModel.internalScale;
                if ( candidateDistance < 50 && candidateDistance < closestDistance )
                {
                    closestNode = candidateNode;
                    closestDistance = candidateDistance;
                }
            }
        }
        return closestNode;
    }

    set activeRelationship(relationship: Relationship) {
        this._activeRelationship = relationship;
        this.onUpdateActiveRelationship();
    }

    get activeRelationship(): Relationship {
        return this._activeRelationship;
    }

    set newRelationship(relationship: Relationship) {
        this._newRelationship = relationship;
    }

    get newRelationship(): Relationship {
        return this._newRelationship;
    }

    getActiveRelationshipLabel(): string {
        return this._activeRelationship.relationshipType;
    }

    getActiveRelationshipPropertiesAsText(): string {
        let properties: string = "";
        if (this._activeRelationship.properties.listEditable().length > 0) {
            properties = this._activeRelationship.properties.listEditable().reduce(
            (previous: string, property: any) => {
                return previous + property.key + ": " + property.value + "\n";
            }, "");
        }
        return properties;
    }

    getActiveNodeLabel(): string {
        return this.activeNode.caption;
    }

    getActiveNodePropertiesAsText(): string {
        let properties: string = "";
        if (this._activeNode.properties.listEditable().length > 0) {
            properties = this._activeNode.properties.listEditable().reduce(
                (previous: string, property: any) => {
                    return previous + property.key + ": " + property.value + "\n";
                }, "");
        }
        return properties;
    }

    addLocalNode(x?: number, y?: number): Node {
        var svgElement = document.getElementById('svgElement');
        x = x || svgElement.clientWidth / 2;
        y = y || svgElement.clientHeight / 2;
        this._activeNode = this.graphModel.createNode();
        this._activeNode.x = x;
        this._activeNode.y = y;
        console.log(`addLocalNode: `, this._activeNode);
        return this._activeNode;
    }

    addNode(x?: number, y?: number): Node {
        this._activeNode = this.addLocalNode(x, y);
        //this.save( formatMarkup() );
        if (this.activeGraph.type == "neo4j") {
            this.neo4jController.addNode(this._activeNode)
                .then((result: any) => {
                    console.log(result);
                    this.onRedraw();
                })
                .catch((error: any) => {
                    console.log(error);
                    this.deleteActiveNode();
                    this.onRedraw();
                })
        }
        this.onRedraw();
        return this._activeNode;
    }

    addLocalRelationship(start: Node, end: Node): Relationship {
        let relationship: Relationship = this.graphModel.createRelationship(start, end);
        return relationship;
    }

    deleteLocalNode(node: Node): void {
        this.graphModel.deleteNode(node);
        if (node == this._newNode) {
            this._newNode = null;
        }
    }

    deleteActiveNode()
    {
        if (this._activeNode) {
            if (this.activeGraph.type == "neo4j") {
                this.neo4jController.deleteNode(this._activeNode)
                    .then((result: any) => {
                        console.log(result);
                        this.graphModel.deleteNode(this._activeNode);
                        this.onRedraw();
                    })
                    .catch((error: any) => {
                        console.log(error);
                    })
            } else {
                this.graphModel.deleteNode(this._activeNode);
                // save( formatMarkup() );
                this.onRedraw();
            }
        }
    }

    deleteActiveRelationship()
    {
        if (this._activeRelationship) {
            if (this.activeGraph.type == "neo4j") {
                this.neo4jController.deleteRelationship(this._activeRelationship)
                    .then((result: any) => {
                        console.log(result);
                        this.graphModel.deleteRelationship(this._activeRelationship);
                        this.onRedraw();
                    })
                    .catch((error: any) => {
                        console.log(error);
                    })
            } else {
                this.graphModel.deleteRelationship(this._activeRelationship);
                // save( formatMarkup() );
                this.onRedraw();
            }
        }
    }

    dispose(): void {
    }
}
