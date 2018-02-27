import path = require('path');
const findRoot = require('find-root');
const pd = require('pretty-data').pd;

import {
    select
} from 'd3-selection';

import { EventEmitter } from "events";
import Neo4jController from '../neo4j/Neo4jController';
import Config from './Config';
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

    public config: Config;
    public appConfigData: any;
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
                      var svgElement = document.getElementById('svgElement');
                      let width: number = svgElement ? svgElement.clientWidth / 2 : 1280;
                      let height: number = svgElement ? svgElement.clientHeight / 2 : 700;
                      this.graphModel = ModelToD3.parseD3(this.graphData, null, {x: width, y: height});
                      // this.graphModel = this.parseMarkup(testMarkup);
                      this.activeNode = this.graphModel.nodeList()[0];
                      this.activeRelationship = this.graphModel.relationshipList()[0];
                      console.log(`graphModel: `, this.graphModel, this.graphModel.nodeList, this.activeNode, this.activeRelationship);
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

    dispose(): void {
    }
}
