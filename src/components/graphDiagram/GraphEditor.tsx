import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import {
    ArrayLike,
    selection,
    select,
    selectAll,
    Selection,
    event
} from 'd3-selection';
import { drag } from 'd3-drag';
import * as d3Array from 'd3-array';
import * as d3Scale from 'd3-scale';
import * as d3Zoom from 'd3-zoom';
import * as d3Force from 'd3-force';

import {
  Diagram,
  Model,
  ModelToD3,
  Node,
  Relationship,
  LayoutModel,
  LayoutNode,
  //LayoutRelationship,
  Markup,
  d3Types
} from 'graph-diagram';

import ToolsPanel from './ToolsPanel';
import NodePanel from './NodePanel';
import RelationshipPanel from './RelationshipPanel';
import AppModel from '../../model/AppModel';

export interface GraphEditorProps {
  appModel: AppModel;
  width: number;
  height: number;
  graphData: d3Types.d3Graph;
}
export interface GraphEditorState {
  lastUpdateTime: number;
}

let thiz: GraphEditor;
let svgContainer: any;
let svg_g: any;
let simulation: any;
let simulationTickCount: number = 0;
let simNodes: any;
let simLinks: any;
let simData = JSON.parse(`
{
  "nodes": [{
      "r": 17
  }, {
      "r": 8
  }, {
      "r": 27
  }],
  "links": [{
      "source": "0",
      "target": "1"
  }, {
      "source": "1",
      "target": "2"
  }, {
      "source": "2",
      "target": "0"
  }]
}
`);

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

export default class GraphEditor extends React.Component < GraphEditorProps, GraphEditorState > {

    public diagram: Diagram;
    public graphModel: Model;
    public newNode: Node = null;
    public newRelationship: Relationship = null;

    private _dragStartHandler: any = this.dragStart.bind(this);
    private _dragEndHandler: any = this.dragEnd.bind(this);
    private _dragNodeHandler: any = this.dragNode.bind(this);
    private _dragRingHandler: any = this.dragRing.bind(this);

    private _editNodeHandler: any = this.editNode.bind(this);
    private _editRelationshipHandler: any = this.editRelationship.bind(this);

    componentWillMount() {
        thiz = this;

        //TODO better initialization of activeNode and activeRelationship
        this.graphModel = new Model();
        let tempNode = this.graphModel.createNode();
        tempNode.x = 0;
        tempNode.y = 0;
        tempNode.caption = "New Node";
        tempNode.properties.set("name", "new");
        let tempRelationship = this.graphModel.createRelationship(tempNode, tempNode);
        tempRelationship.relationshipType = "";
        tempRelationship.properties.set("name", "new");
        this.props.appModel.activeNode = tempNode;
        this.props.appModel.activeRelationship = tempRelationship;

        this.setState(({lastUpdateTime}) => ({lastUpdateTime: 0}));
      }

    componentDidMount() {
        this.setupSvg();

        console.log(this.props.graphData);
        var svgElement = document.getElementById('svgElement')
        this.graphModel = ModelToD3.parseD3(this.props.graphData, null, {x: svgElement.clientWidth / 2, y: svgElement.clientHeight / 2})
        // this.graphModel = this.parseMarkup(testMarkup);
        this.props.appModel.activeNode = this.graphModel.nodeList[0];

        console.log(`graphModel`, this.graphModel);
        console.log(`d3`, ModelToD3.convert(this.graphModel));

        this.diagram = new Diagram()
            .scaling(null)
            .overlay(function(layoutModel: LayoutModel, view: any) {
                var nodeOverlays = view.selectAll("circle.node.overlay")
                    .data(layoutModel.nodes);

                nodeOverlays.exit().remove();

                var nodeOverlaysEnter = nodeOverlays.enter().append("circle")
                    .attr("class", "node overlay");

                var merge = nodeOverlays.merge(nodeOverlaysEnter);

                merge
                    .call(drag().on("start", thiz._dragStartHandler).on( "drag", function() {thiz._dragNodeHandler(this["__data__"])} ).on( "end", thiz._dragEndHandler ) )
                    .on( "dblclick", function() {thiz._editNodeHandler(this["__data__"])} )
                    .attr("r", function(node: LayoutNode) {
                        return node.radius.outside();
                    })
                    .attr("stroke", "none")
                    .attr("fill", "rgba(255, 255, 255, 0)")
                    .attr("cx", function(node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ex();
                    })
                    .attr("cy", function(node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ey();
                    });

                var nodeRings = view.selectAll("circle.node.ring")
                    .data(layoutModel.nodes);

                nodeRings.exit().remove();

                var nodeRingsEnter = nodeRings.enter().append("circle")
                    .attr("class", "node ring");

                var merge = nodeRings.merge(nodeRingsEnter);

                merge
                    .call(drag().on( "drag", function() {thiz._dragRingHandler(this["__data__"])} ).on( "end", thiz._dragEndHandler ) )
                    .attr("r", function(node: LayoutNode) {
                        return node.radius.outside() + 5;
                    })
                    .attr("fill", "none")
                    .attr("stroke", "rgba(255, 255, 255, 0)")
                    .attr("stroke-width", "10px")
                    .attr("cx", function(node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ex();
                    })
                    .attr("cy", function(node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ey();
                    });

                var relationshipsOverlays = view.selectAll("path.relationship.overlay")
                    .data(layoutModel.relationships);

                relationshipsOverlays.exit().remove();

                var relationshipsOverlaysEnter = relationshipsOverlays.enter().append("path")
                    .attr("class", "relationship overlay");

                var merge = relationshipsOverlays.merge(relationshipsOverlaysEnter);

                merge
                    .attr("fill", "rgba(255, 255, 255, 0)")
                    .attr("stroke", "rgba(255, 255, 255, 0)")
                    .attr("stroke-width", "10px")
                    .on( "dblclick", function() {thiz._editRelationshipHandler(this["__data__"])})
                    .attr("transform", function(r: any) {
                        var angle = r.start.model.angleTo(r.end.model);
                        return "translate(" + r.start.model.ex() + "," + r.start.model.ey() + ") rotate(" + angle + ")";
                    } )
                    .attr("d", function(d: any) { return d.arrow.outline; } );
            });
        console.log(`diagram: `, this.diagram);
        this.draw();
        this.startSimulation();
    }

    parseMarkup( markup: any )
    {
        var container: any = select( "body" ).append( "div" );
        container.node().innerHTML = markup;
        var model = Markup.parse( container.select("ul.graph-diagram-markup"));
        container.remove();
        return model;
    }

    // bound to this via _dragStartHandler
    dragStart() {
        // console.log(`dragStart: ${event.x}, ${event.y}`, this);
        this.newNode = null;
    }

    dragNode(__data__: any)
    {
        var layoutNode: LayoutNode = __data__ as LayoutNode;
        var graphNode: Node = layoutNode.model as Node;
        graphNode.drag(event.dx, event.dy);
        //diagram.scaling(Scaling.growButDoNotShrink);
        this.draw();
    }

    dragRing(__data__: any)
    {
        // console.log(`dragRing: ${event.x}, ${event.y}`);
        var node: Node = __data__.model as Node;
        if ( !this.newNode )
        {
            this.newNode = this.graphModel.createNode();
            this.newNode.x = event.x;
            this.newNode.y = event.y;
            // console.log(`dragRing: this.newRelationship ${node.id}, ${this.newNode.id}`);
            this.newRelationship = this.graphModel.createRelationship( node, this.newNode );
        }
        var connectionNode = this.findClosestOverlappingNode( this.newNode );
        if ( connectionNode )
        {
            this.newRelationship.end = connectionNode
        } else
        {
            this.newRelationship.end = this.newNode;
        }
        // node = this.newNode;
        this.newNode.drag(event.dx, event.dy);
        //diagram.scaling(Scaling.growButDoNotShrink);
        this.draw();
    }

    // bound to this via _dragEndHandler
    dragEnd()
    {
        // console.log(`dragEnd: ${event.x}, ${event.y}`, this);
        if ( this.newNode )
        {
            this.newNode.dragEnd();
            if ( this.newRelationship && this.newRelationship.end !== this.newNode )
            {
                this.graphModel.deleteNode( this.newNode );
            }
        }
        this.newNode = null;
        // save( formatMarkup() );
        //diagram.scaling(Scaling.centerOrScaleDiagramToFitSvgSmooth);
        this.draw();
    }

    findClosestOverlappingNode( node: any )
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

    ////////

    editNode(__data__: any)
    {
        this.props.appModel.activeNode = __data__.model;
        this.props.appModel.onUpdateActiveNode(null);
        console.log(`editnode: `, this.props.appModel.activeNode);
    }

    editRelationship(__data__: any)
    {
      this.props.appModel.activeRelationship = __data__.model;
      this.props.appModel.onUpdateActiveRelationship(null);
        console.log(`editRelationship: `, this.props.appModel.activeRelationship);
    }

    ////////

    setupSvg() {
      if (svg_g) {
        select("svg").remove();
        svg_g = null;
      }

      svgContainer = select("#svgContainer")
          // .style("z-index", -1000);
      svg_g = svgContainer.append("svg:svg")
         .attr("class", "graphdiagram")
         .attr("id", "svgElement")
         .attr("width", "100%")
         .attr("height", "100%")
         .call(d3Zoom.zoom().on("zoom", function () {
            svg_g.attr("transform", event.transform)
         }))
         .on("dblclick.zoom", null)
         .append("g")

      var svgElement = document.getElementById('svgElement');
      console.log(`SVG:`);
      console.log(svgContainer, svg_g, svgElement)
      var x = svgElement.clientWidth / 2;
      var y = svgElement.clientHeight / 2;

      var w = 10,
      h = 10,
      s = '#999999',
      so = 0.5,
      sw = '1px';

      svg_g.append('line')
          .attr('x1', x - w / 2)
          .attr('y1', y)
          .attr('x2', x + w / 2)
          .attr('y2', y)
          .style('stroke', s)
          .style('stroke-opacity', so)
          .style('stroke-width', sw);

      svg_g.append('line')
          .attr('x1', x)
          .attr('y1', y - h / 2)
          .attr('x2', x)
          .attr('y2', y + h / 2)
          .style('stroke', s)
          .style('stroke-opacity', so)
          .style('stroke-width', sw);
    }

    generateSimData(diagram: Diagram): any {
        let layoutNodes: LayoutNode[] = this.diagram.layout.layoutModel.nodes;
        let layoutRelationships: any[] = this.diagram.layout.layoutModel.relationships;

        let nodes: any[] = [];
        let links: any[] = [];

        layoutNodes.forEach((layoutNode: LayoutNode) => {
            let node: any = {};
            node.layoutNode = layoutNode;
            node.r = layoutNode.radius.insideRadius * 2;
            nodes.push(node);
        });

        layoutRelationships.forEach((layoutRelationship: any) => {
            let link: any = {};
            link.layoutRelationship = layoutRelationship;
            link.source = layoutRelationship.start.model.index;
            link.target = layoutRelationship.end.model.index;
            links.push(link);
        });

        return {
            nodes: nodes,
            links: links
        }
    }

    startSimulation(): void {
        console.log(`startSimulation:`);
        var svgElement = document.getElementById('svgElement')

        simulation = d3Force.forceSimulation()
            .force("link", d3Force.forceLink().id(function(d: any) { return d.index }))
            .force("collide",d3Force.forceCollide( function(d: any){return d.r }).iterations(16) )
            .force("charge", d3Force.forceManyBody())
            .force("center", d3Force.forceCenter(svgElement.clientWidth / 2, svgElement.clientHeight / 2))
            .force("y", d3Force.forceY(0))
            .force("x", d3Force.forceX(0));

        // simNodes = svg_g.select( "g.layer.nodes" )
        //     .selectAll("circle")
        //     .data(this.diagram.layout.layoutModel.nodes)
        //
        // simLinks = svg_g.select( "g.layer.relationships" )
        //     .selectAll("path");

        simData = thiz.generateSimData(thiz.diagram);
        console.log(`simData`, simData);

        // simLinks = svg_g.append("g")
        //     .attr("class", "links")
        //     .selectAll("line")
        //     .data(simData.links)
        //     .enter()
        //     .append("line")
        //     .attr("stroke", "black")

        simNodes = svg_g.select( "g.layer.nodes" )
            .selectAll("circle")
            .data(simData.nodes)

        // simNodes= svg_g.append("g")
        //     .attr("class", "nodes")
        //     .selectAll("circle")
        //     .data(simData.nodes)
        //     .enter().append("circle")
        //     .attr("r", function(d: any){  return d.r + 8 })
        //     .call(drag()
        //         .on("start", thiz.dragstarted)
        //         .on("drag", thiz.dragged)
        //         .on("end", thiz.dragended));

        console.log(`simNodes`, simNodes);
        // console.log(`simLinks`, simLinks);


        simulation
            .nodes(simData.nodes)
            .on("tick", thiz.ticked)
            .on("end", thiz.ended);

        simulation.force("link")
            .links(simData.links);

        //simulation.stop();
    }

    dragstarted(d: any) {
        // if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(d: any) {
        // if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    ticked() {
        // simLinks
        //     .attr("x1", function(d: any) { return d.source.x; })
        //     .attr("y1", function(d: any) { return d.source.y; })
        //     .attr("x2", function(d: any) { return d.target.x; })
        //     .attr("y2", function(d: any) { return d.target.y; });

        simNodes
            .attr("cx", function(d: any) { return d.x; })
            .attr("cy", function(d: any) { return d.y; });

        // console.log(`tick: ${simulationTickCount}`);
        simulationTickCount++
        if (simulationTickCount >= 20) {
            thiz.ended();
        }
    }

    ended() {
        console.log(`ended simulation after ${simulationTickCount} ticks`);
        simulation.stop();
        simData.nodes.forEach((node: any) => {
            node.layoutNode.x = node.x;
            node.layoutNode.y = node.y;
            node.layoutNode.model.x = node.x;
            node.layoutNode.model.y = node.y;
        });
        thiz.draw();
    }

    draw()
    {
        svg_g
            .data([this.graphModel])
            .call(this.diagram.render);
    }

    render() {
        return (
            <div>
                <div id="svgContainer"></div>
                <ToolsPanel appModel={this.props.appModel} />
                <NodePanel appModel={this.props.appModel} />
                <RelationshipPanel appModel={this.props.appModel} />
            </div>
        );
    }
}
