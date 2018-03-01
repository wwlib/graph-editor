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
  Node,
  Relationship,
  LayoutModel,
  LayoutNode,
  LayoutRelationship,
  Markup,
  d3Types
} from 'graph-diagram';

import ToolsPanel from './ToolsPanel';
import CypherPanel from './CypherPanel';
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
  scale: number;
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

export default class GraphEditor extends React.Component < GraphEditorProps, GraphEditorState > {

    public diagram: Diagram;
    // public graphModel: Model;
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
        this.setState(({scale, lastUpdateTime}) => ({scale: 1.0, lastUpdateTime: 0}));
      }

    componentDidMount() {
        this.setupSvg();

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

    // parseMarkup( markup: any )
    // {
    //     var container: any = select( "body" ).append( "div" );
    //     container.node().innerHTML = markup;
    //     var model = Markup.parse( container.select("ul.graph-diagram-markup"));
    //     container.remove();
    //     return model;
    // }

    addNode() {
        this.newNode = this.props.appModel.graphModel.createNode();
        var svgElement = document.getElementById('svgElement')
        this.newNode.x = svgElement.clientWidth / 2;
        this.newNode.y = svgElement.clientHeight / 2;
        console.log(`addNode: `, this.newNode);
        //this.save( formatMarkup() );
        this.draw();
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
            this.newNode = this.props.appModel.graphModel.createNode();
            this.newNode.x = event.x;
            this.newNode.y = event.y;
            // console.log(`dragRing: this.newRelationship ${node.id}, ${this.newNode.id}`);
            this.newRelationship = this.props.appModel.graphModel.createRelationship( node, this.newNode );
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
                this.props.appModel.graphModel.deleteNode( this.newNode );
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

        var allNodes = this.props.appModel.graphModel.nodeList();

        for ( var i = 0; i < allNodes.length; i++ )
        {
            var candidateNode = allNodes[i];
            if ( candidateNode !== node )
            {
                var candidateDistance = node.distanceTo( candidateNode ) * this.props.appModel.graphModel.internalScale;
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
        let layoutRelationships: LayoutRelationship[] = this.diagram.layout.layoutModel.relationships;

        let nodes: any[] = [];
        let links: any[] = [];

        layoutNodes.forEach((layoutNode: LayoutNode) => {
            let node: any = {};
            node.layoutNode = layoutNode;
            node.r = layoutNode.radius.insideRadius * 2;
            nodes.push(node);
        });

        layoutRelationships.forEach((layoutRelationship: LayoutRelationship) => {
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
            .data([this.props.appModel.graphModel])
            .call(this.diagram.render);
    }

    onButtonClicked(action: string): void {
        console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'addNode':
                this.addNode();
                break;
            case 'bubbles':
                this.diagram.toggleRenderPropertyBubblesFlag();
                this.draw();
        }
    }

    changeInternalScale() {
        var temp: any = select("#internalScale").node();
        this.props.appModel.graphModel.internalScale = temp.value;
        this.setState({
            scale: temp.value
        });
        this.draw();
    }

    render() {
        return (
            <div>
                <div id="svgContainer"></div>
                <div id="graphEditorButtons" className="well">
                    <ReactBootstrap.Button id="addNodeButton" bsStyle={'default'} key={"addNode"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "addNode")}><i className="icon-plus"></i> Node</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="bubblesButton" bsStyle={'default'} key={"bubbles"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "bubbles")}>Bubbles</ReactBootstrap.Button>
                    <input id="internalScale" type="range" min="0.1" max="5" value={this.state.scale} step="0.01" onChange={this.changeInternalScale.bind(this)}/>
                </div>
                <ToolsPanel appModel={this.props.appModel} />
                <CypherPanel appModel={this.props.appModel} />
                <NodePanel appModel={this.props.appModel} />
                <RelationshipPanel appModel={this.props.appModel} />
            </div>
        );
    }
}
