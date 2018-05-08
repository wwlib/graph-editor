const pd = require('pretty-data').pd;

import {
    select
} from 'd3-selection';

import { EventEmitter } from "events";
import Neo4jController from '../neo4j/Neo4jController';
import AppSettings from './AppSettings';
import GraphSet from './GraphSet';
import Graph from './Graph';

import {
  Model,
  ModelToCypher,
  ModelToD3,
  Markup,
  Node,
  Relationship
} from 'graph-diagram';

import Neo4jGraphConfig, { SavedCypher } from './Neo4jGraphConfig';
import ModelToDot from './ModelToDot';

export default class AppModel extends EventEmitter {

    public settings: AppSettings;
    public appSettingsData: any;
    public userDataPath: string = '';
    public graphSet: GraphSet | undefined;
    public neo4jController: Neo4jController | undefined;
    public graphModel: Model | undefined;
    public activeGraph: Graph | undefined;
    public appDimensions: {width: number, height: number} = {width: 1280, height:720}

    private _activeNode: Node | undefined;
    private _activeRelationship: Relationship  | undefined;
    private _newNode: Node | undefined;
    private _newRelationship: Relationship | undefined;

    constructor() {
        super();
        this.settings = new AppSettings();
        this.settings.load((err: any, obj: any) => {
            if (err || !this.settings.data) {
                this.settings.data = {
                    userDataPath: AppSettings.DEFAULT_USER_DATA_PATH
                }
                console.log(`AppModel: Settings not found. Using default.`, this.settings.data);
                this.initWithData(this.settings.data);
                this.saveSettings();
            } else {
                this.initWithData(this.settings.data);
            }

            this.graphSet = new GraphSet(this);
            this.graphSet.loadGraphNames()
                .then(() => {
                //    this.initGraphWithName('example-file'); //this.graphSet.getGraphNames()[1]);
                   this.emit('ready', this);
                   this.newGraph();
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

    newGraph(options?: any): void {
        options = options || {};
        let svgElement = document.getElementById('svgElement');
        let x: number = svgElement ? svgElement.clientWidth / 2 : this.appDimensions.width / 2;
        let y: number = svgElement ? svgElement.clientHeight / 2 : this.appDimensions.height / 2;
        let newGraphJSON: any = {
            name: options.graphName || '<filename>',
            connection: options.connection || {type: "file"},
            config: options.config || {},
            scale: options.scale || 1.0,
            css: options.css || `
circle.node-base {
  fill: #FF756E;
  stroke: #E06760;
  stroke-width: 3px;
}
`,
            d3Graph: options.d3Graph,
            markup: options.markup,
            dot: options.dot
        }

        let newGraph: Graph = new Graph().initWithJson(newGraphJSON);
        // console.log(`newGraphJSON: `, newGraphJSON, newGraph);
        if (newGraph.name != '<filename>' && this.graphSet) {
            this.graphSet.addGraph(newGraph);
            this.saveGraph(newGraph);
        }
        if (newGraph.type == "neo4j") {
            this.initGraph(newGraph);
        } else if (newGraph.type == "file" && (options.markup || options.d3Graph || options.dot) ) {
            this.initGraph(newGraph);
        } else {
            this.graphModel = new Model();
            let node: Node = this.graphModel.createNode();
            node.x = x;
            node.y = y;
            node.caption = 'New Node';
            this._activeNode = this.graphModel.nodeList()[0];
            this._activeRelationship = undefined;
            this.activeGraph = newGraph;
            this.applyActiveGraphCss();
            this.onUpdateActiveGraph();
        }
    }

    initGraphWithName(name: string) {
        // console.log(`initGraphWithName: ${name}`);
        if (this.graphSet) {
            this.graphSet.loadGraphWithName(name)
                .then((graph:Graph) => {
                    this.initGraph(graph);
                });
        }

    }

    getSvgOrigin(): any {
        let svgElement = document.getElementById('svgElement');
        let x: number = svgElement ? svgElement.clientWidth / 2 : this.appDimensions.width / 2;
        let y: number = svgElement ? svgElement.clientHeight / 2 : this.appDimensions.height / 2;
        return { x: x, y: y };
    }

    initGraph(graph: Graph): void {
        switch(graph.type) {
            case "file":
                if (graph.d3Graph) {
                    this.graphModel = ModelToD3.parseD3(graph.d3Graph, undefined, this.getSvgOrigin());
                } else if (graph.markup) {
                    this.graphModel = this.parseMarkup(graph.markup);
                } else if (graph.dot) {
                    this.graphModel = ModelToDot.parseDot(graph.dot, undefined, this.getSvgOrigin());
                }
                if (this.graphModel) {
                    this._activeNode = this.graphModel.nodeList()[0];
                    this._activeRelationship = this.graphModel.relationshipList()[0];
                }
                this.activeGraph = graph;
                this.applyActiveGraphCss();
                this.onUpdateActiveGraph();
                break;
            case "neo4j":
                this.neo4jController = new Neo4jController(graph.connection);
                graph.config = new Neo4jGraphConfig(graph.config);
                this.createGraphModelWithCypherQuery(graph.connection.initialCypher, graph);
                break;
        }
    }

    createGraphModelWithCypherQuery(cypher: string, graph?: Graph): void {
        graph = graph || this.activeGraph;
        if(this.neo4jController) {
            this.neo4jController.getCypherAsD3(cypher)
                .then(data => {
                    this.graphModel = ModelToD3.parseD3(data, undefined, this.getSvgOrigin());
                    this._activeNode = this.graphModel.nodeList()[0];
                    this._activeRelationship = this.graphModel.relationshipList()[0];
                    this.activeGraph = graph;
                    this.applyActiveGraphCss();
                    this.onUpdateActiveGraph();
                    this.emit('onCypherExecuted', data);
                })
                .catch((error: any) => {
                    console.log(`createGraphModelWithCypherQuery: error:`, error);
                    this.emit('onCypherExecutionError', error);
                })
        }
    }

    saveActiveNode(label: string, propertiesText: any, oldLabel?: string): void {
        console.log(`AppModel: saveActiveNode: `, label, propertiesText, oldLabel, this.activeGraph);
        if (this._activeNode) {
            let labelBackup: string = this._activeNode.caption;
            let propertiesBackup: any = this._activeNode.properties.toJSON();

            this._activeNode.caption = label;
            this._activeNode.properties.clearAll();
            propertiesText.split("\n").forEach((line: string) => {
                let tokens = line.split(/: */);
                if (tokens.length === 2) {
                    var key = tokens[0].trim();
                    var value = tokens[1].trim();
                    if (key.length > 0 && value.length > 0) {
                        if (this._activeNode) {
                            this._activeNode.properties.set(key, value);
                        }
                    }
                }
            });

            if (this.activeGraph && this.activeGraph.type == "neo4j" && this.neo4jController) {
                this.neo4jController.updateNode(this._activeNode, oldLabel)
                    .then((response: any) => {
                        // console.log(response);
                    })
                    .catch((error: any) => {
                        console.log(error);
                        console.log(`ERROR: restoring node label and properties`);
                        if (this._activeNode) {
                            this._activeNode.caption = labelBackup;
                            this._activeNode.properties.clearAll();
                            for (let key in propertiesBackup) {
                                this._activeNode.properties.set(key, propertiesBackup[key]);
                            }
                        }
                    });
            }
        }
    }

    saveActiveRelationship(label: string, propertiesText: any): void {
        if (this._activeRelationship) {
            let labelBackup: string = this._activeRelationship.relationshipType;
            let propertiesBackup: any = this._activeRelationship.properties.toJSON();

            this._activeRelationship.relationshipType = label;
            this._activeRelationship.properties.clearAll();
            propertiesText.split("\n").forEach((line: string) => {
                let tokens = line.split(/: */);
                if (tokens.length === 2) {
                    var key = tokens[0].trim();
                    var value = tokens[1].trim();
                    if (this._activeRelationship) {
                        if (key.length > 0 && value.length > 0) {
                            this._activeRelationship.properties.set(key, value);
                        }
                    }
                }
            });

            if (this.activeGraph && this.neo4jController && this.activeGraph.type == "neo4j") {
                if (!this._activeRelationship._relationshipType) {
                    this._activeRelationship._relationshipType = "RELATED_TO";
                }
                this.neo4jController.updateRelationship(this._activeRelationship)
                    .then((response: any) => {
                        // console.log(response, this.graphModel);
                    })
                    .catch((error: any) => {
                        console.log(error);
                        console.log(`ERROR: restoring relationship label and properties`);
                        if (this._activeRelationship) {
                            this._activeRelationship.relationshipType = labelBackup;
                            this._activeRelationship.properties.clearAll();
                            for (let key in propertiesBackup) {
                                this._activeRelationship.properties.set(key, propertiesBackup[key]);
                            }
                        }
                    });
            }
        }
    }

    reverseActiveRelationship(): void {
        if (this._activeRelationship && this.activeGraph) {
            if (this.activeGraph.type == "neo4j") {
                if (this.neo4jController) {
                    this.neo4jController.reverseRelationship(this._activeRelationship)
                        .then((result: any) => {
                            // console.log(result);
                            if (this._activeRelationship) {
                                this._activeRelationship.reverse();
                                this.onRedraw();
                            }
                        })
                        .catch((error: any) => {
                            console.log(error);
                        })
                }
            } else {
                this._activeRelationship.reverse();
                this.onRedraw();
            }
        }
    }

    // onUpdateData(event: any): void {
    //     this.emit('graphModel', this);
    // }

    onUpdateActiveGraph(event?: any): void {
        this.emit('updateActiveGraph');
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
        var markup: string = '';
        if (this.graphModel) {
            Markup.format( this.graphModel, container );
            markup= container.node().innerHTML;
            markup = markup
                .replace( /<li/g, "\n  <li" )
                .replace( /<span/g, "\n    <span" )
                .replace( /<\/span><\/li/g, "</span>\n  </li" )
                .replace( /<\/ul/, "\n</ul" );
            container.remove();
        }
        return markup;
    }

    getCypher(): string {
        return this.graphModel ? ModelToCypher.convert(this.graphModel) : '';
    }

    getD3(): string {
        return this.graphModel ? JSON.stringify(ModelToD3.convert(this.graphModel), null, 2) : '';
    }

    getSVG(): string {
        let svg: any = select("#svgContainer svg");
        svg.select("g")
            .attr("id", "firstg")
        let style = svg.select("#firststyle")
        if (style.empty()) {
            style = svg.insert("style", "#firstg")
                .attr("id", "firststyle");
        }
        style.html(this.getCSS());

        let xml: any = select("#svgContainer svg").node();
        let rawSvg: any = new XMLSerializer().serializeToString(xml);
        let xml_pp = pd.xml(rawSvg);
        return xml_pp;
    }

    getCSS(): string {
        let styleData = this.activeGraph ? this.activeGraph.css : '';
        // styleData = `/* <![CDATA[ */\n${styleData}\n/* ]]> */`;
        let css_pp = pd.css(styleData)
        return css_pp;
    }

    //// neo4j

    getSavedCypherList(): any[] {
        // console.log(`getSavedCypherList: `, this.activeGraph);
        let result: any[] = [];
        if (this.activeGraph && this.activeGraph.type == "neo4j") {
            let neo4jGraphConfig: Neo4jGraphConfig = this.activeGraph.config;
            result = neo4jGraphConfig.savedCyphersToArray();
        }
        return result;
    }

    newSavedCypher(): number {
        let result: number = 0;
        if (this.activeGraph && this.activeGraph.type == "neo4j") {
            let neo4jGraphConfig: Neo4jGraphConfig = this.activeGraph.config;
            result = neo4jGraphConfig.addSavedCypher('<cypher name>', '<cypher>');
        }
        return result;
    }

    deleteSavedCypher(savedCypher: SavedCypher): number {
        if (this.activeGraph && this.activeGraph.type == "neo4j") {
            let neo4jGraphConfig: Neo4jGraphConfig = this.activeGraph.config;
            neo4jGraphConfig.deleteSavedCypherWithIndex(savedCypher.index);
        }
        return 0
    }

    // executeCypher(cypher: string): void {
    //     // console.log(`executeCypher: ${cypher}`);
    //     let svgElement = document.getElementById('svgElement');
    //     // let width: number = svgElement ? svgElement.clientWidth / 2 : this.appDimensions.width;
    //     // let height: number = svgElement ? svgElement.clientHeight / 2 : this.appDimensions.height;
    //     this.neo4jController.getCypherAsD3(cypher)
    //         .then(data => {
    //             // this.graphData = data;
    //             // this.graphModel = ModelToD3.parseD3(this.graphData, null, {x: width, y: height});
    //             // this.activeNode = this.graphModel.nodeList()[0];
    //             // this._activeRelationship = this.graphModel.relationshipList()[0];
    //             // console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this._activeRelationship);
    //             // console.log(`activeGraph: `, this.activeGraph);
    //             this.emit('onCypherExecuted', data);
    //         })
    //         .catch((error: any) => {
    //             this.emit('onCypherExecutionError', error);
    //         })
    //
    // }
    //
    // executeCypherWithIndex(index: number): void {
    //
    // }

    ////

    set activeNode(node: Node | undefined) {
        this._activeNode = node;
        this.onUpdateActiveNode();
    }

    get activeNode(): Node | undefined{
        return this._activeNode;
    }

    set newNode(node: Node | undefined) {
        this._newNode = node;
    }

    get newNode(): Node | undefined {
        return this._newNode;
    }

    onDragRing(__data__:any, event: any): void {
        var node: Node = __data__.model as Node;
        if ( !this._newNode )
        {
            this._newNode = this.addLocalNode(event.x, event.y);
            if (this._newNode) {
                this._newRelationship = this.addLocalRelationship( node, this._newNode );
            }
        }
        if (this._newNode && this._newRelationship) {
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
    }

    async onDragEnd() {
        // console.log(`AppModel: onDragEnd`, this._newNode, this._newRelationship);
        if ( this._newNode && this._newRelationship && this.activeGraph)
        {
            this._newNode.dragEnd();
            if ( this._newRelationship && this._newRelationship.end !== this._newNode )
            {
                this.deleteLocalNode( this._newNode );
            } else {
                if (this.activeGraph.type == "neo4j" && this.neo4jController) {
                    // corresponding new node in neo4j
                    await this.neo4jController.addNode(this._newNode);
                }
            }
            if (this.activeGraph.type == "neo4j" &&  this.neo4jController) {
                //create corresponding new relationship in neo4j
                await this.neo4jController.addRelationship(this._newRelationship);
            }
        }

        this._newNode = undefined;
        this._newRelationship = undefined;
    }

    findClosestOverlappingNode( node: Node ): Node | undefined
    {
        var closestNode = undefined;
        var closestDistance = Number.MAX_VALUE;

        if (this.graphModel) {
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
        }
        return closestNode;
    }

    set activeRelationship(relationship: Relationship | undefined) {
        this._activeRelationship = relationship;
        this.onUpdateActiveRelationship();
    }

    get activeRelationship(): Relationship | undefined {
        return this._activeRelationship;
    }

    set newRelationship(relationship: Relationship | undefined) {
        this._newRelationship = relationship;
    }

    get newRelationship(): Relationship | undefined {
        return this._newRelationship;
    }

    getActiveRelationshipLabel(): string {
        let label: string = '';
        if (this._activeRelationship) {
            label = this._activeRelationship.relationshipType;
        }
        return label;
    }

    getActiveRelationshipPropertiesAsText(): string {
        let properties: string = '';
        if (this._activeRelationship) {
            if (this._activeRelationship.properties.listEditable().length > 0) {
                properties = this._activeRelationship.properties.listEditable().reduce(
                (previous: string, property: any) => {
                    return previous + property.key + ': ' + property.value + '\n';
                }, '');
            }
        }
        return properties;
    }

    getActiveNodeLabel(): string {
        return this._activeNode ? this._activeNode.caption : '';
    }

    getActiveNodePropertiesAsText(): string {
        let properties: string = "";
        if (this._activeNode && this._activeNode.properties.listEditable().length > 0) {
            properties = this._activeNode.properties.listEditable().reduce(
                (previous: string, property: any) => {
                    return previous + property.key + ": " + property.value + "\n";
                }, "");
        }
        return properties;
    }

    addLocalNode(x?: number, y?: number): Node  | undefined{
        var svgElement = document.getElementById('svgElement');
        if (svgElement && this.graphModel) {
            x = x || svgElement.clientWidth / 2;
            y = y || svgElement.clientHeight / 2;
            this._activeNode = this.graphModel.createNode();
            this._activeNode.x = x;
            this._activeNode.y = y;
            return this._activeNode;
        } else {
            return undefined
        }

    }

    addNode(x?: number, y?: number): Node | undefined {
        this._activeNode = this.addLocalNode(x, y);
        //this.save( formatMarkup() );
        if (this.activeGraph && this.activeGraph.type == "neo4j" && this.neo4jController && this._activeNode) {
            this.neo4jController.addNode(this._activeNode)
                .then((result: any) => {
                    // console.log(result);
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

    addLocalRelationship(start: Node, end: Node): Relationship | undefined {
        let relationship: Relationship | undefined = undefined;
        if (this.graphModel && this.activeGraph) {
            relationship = this.graphModel.createRelationship(start, end);
            if (this.activeGraph.type == "neo4j" && !relationship._relationshipType) {
                relationship._relationshipType = "RELATED_TO";
            }
        }
        return relationship;
    }

    deleteLocalNode(node: Node): void {
        if (this.graphModel) {
            this.graphModel.deleteNode(node);
            if (node == this._newNode) {
                this._newNode = undefined;
            }
        }
    }

    deleteActiveNode()
    {
        if (this._activeNode && this.activeGraph) {
            if (this.activeGraph.type == "neo4j") {
                if (this.neo4jController) {
                    this.neo4jController.deleteNode(this._activeNode)
                        .then((result: any) => {
                            // console.log(result);
                            if (this.graphModel && this._activeNode) {
                                this.graphModel.deleteNode(this._activeNode);
                                this.onRedraw();
                            }
                        })
                        .catch((error: any) => {
                            console.log(error);
                        })
                }
            } else {
                if (this.graphModel) {
                    this.graphModel.deleteNode(this._activeNode);
                    // save( formatMarkup() );
                    this.onRedraw();
                }
            }
        }
    }

    deleteActiveRelationship()
    {
        if (this._activeRelationship && this.activeGraph) {
            if (this.activeGraph.type == "neo4j") {
                if (this.neo4jController) {
                    this.neo4jController.deleteRelationship(this._activeRelationship)
                        .then((result: any) => {
                            // console.log(result);
                            if (this.graphModel && this._activeRelationship) {
                                this.graphModel.deleteRelationship(this._activeRelationship);
                                this.onRedraw();
                            }
                        })
                        .catch((error: any) => {
                            console.log(error);
                        })
                }
            } else {
                if (this.graphModel) {
                    this.graphModel.deleteRelationship(this._activeRelationship);
                    // save( formatMarkup() );
                    this.onRedraw();
                }
            }
        }
    }

    applyActiveGraphCss(css?: string): void {
        if (this.activeGraph) {
            this.activeGraph.css = css || this.activeGraph.css;
            let graphEditorStyleSheet = document.getElementById('graph-editor-style');
            if (graphEditorStyleSheet) {
                graphEditorStyleSheet.innerHTML = pd.css(this.activeGraph.css);
            }
        }
    }

    saveActiveGraph(): void {
        // console.log(`saveActiveGraph: `, this.activeGraph, this.graphModel);
        if (this.activeGraph) {
            this.saveGraph(this.activeGraph);
        }
    }

    saveGraph(graph: Graph): void {
        if (graph && this.graphModel && this.graphSet) {
            if (graph.type == "file") {
                graph.d3Graph = ModelToD3.convert(this.graphModel);
                graph.markup = this.getMarkup();
            }
            this.graphSet.saveGraph(graph);
        }
    }

    dispose(): void {
    }
}
