import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import FontAwesome from 'react-fontawesome';

import {
    select,
    Selection,
    event
} from 'd3-selection';
import { drag } from 'd3-drag';
import * as d3Zoom from 'd3-zoom';
import * as d3Force from 'd3-force';

import {
  Diagram,
  Node,
  Relationship,
  LayoutModel,
  LayoutNode,
  LayoutRelationship
} from 'graph-diagram';

import ToolsPanel from './ToolsPanel';
import CypherPanel from './CypherPanel';
import NodePanel from './NodePanel';
import RelationshipPanel from './RelationshipPanel';
import AppModel from '../../model/AppModel';

export interface GraphEditorProps {
  appModel: AppModel;
}
export interface GraphEditorState {
  scale: number;
  showNodePanel: boolean;
  showRelationshipPanel: boolean;
  showCypherPanel: boolean;
  lastUpdateTime: number;
}

let thiz: GraphEditor;
let svgContainer: any;
let svg: Selection<Element, {}, any, any> | undefined;
let svg_g: Selection<Element, {}, any, any> | undefined;
let simulation: any;
let simulationTickCount: number = 0;
let simulationMaxTicks: number;
let simNodes: any;
// let simLinks: any;
let simData: any;

export default class GraphEditor extends React.Component < GraphEditorProps, GraphEditorState > {

    public diagram: Diagram | undefined;

    private _dragStartHandler: any = this.dragStart.bind(this);
    private _dragEndHandler: any = this.dragEnd.bind(this);
    private _dragNodeHandler: any = this.dragNode.bind(this);
    private _dragRingHandler: any = this.dragRing.bind(this);

    private _editNodeHandler: any = this.editNode.bind(this);
    private _editRelationshipHandler: any = this.editRelationship.bind(this);
    private _onUpdateActiveGraphHandler: any = this.onUpdateActiveGraph.bind(this);
    private _onRedrawGraphHandler: any = this.onRedrawGraph.bind(this);

    componentWillMount() {
        thiz = this;
        this.setState({
            scale: 1.0,
            showNodePanel: false,
            showRelationshipPanel: false,
            showCypherPanel: false,
            lastUpdateTime: 0
        });

        this.props.appModel.on('redrawGraph', this._onRedrawGraphHandler);
        this.props.appModel.on('updateActiveGraph', this._onUpdateActiveGraphHandler);
      }

    componentDidMount() {
    }

    componentWillUnmount() {
        this.props.appModel.removeListener('redrawGraph', this._onRedrawGraphHandler);
        this.props.appModel.removeListener('updateActiveGraph', this._onUpdateActiveGraphHandler);
    }

    componentWillReceiveProps(nextProps: GraphEditorProps) {
    }

    initGraphEditor(): void {
        this.diagram = new Diagram()
            .scaling(null)
            .overlay(function(layoutModel: LayoutModel, view: any) {
                // fixes a null reference when dragging
                let svgElement: Selection<SVGSVGElement, any, HTMLElement, any> = select<SVGSVGElement, any>('svg');
                view = svgElement.select('g.layer.overlay');

                var nodeOverlays = view.selectAll("circle.node.overlay")
                    .data(layoutModel.nodes);

                nodeOverlays.exit().remove();

                var nodeOverlaysEnter = nodeOverlays.enter().append("circle")
                    .attr("class", "node overlay");

                var merge = nodeOverlays.merge(nodeOverlaysEnter);

                merge
                    .call(drag().on("start", thiz._dragStartHandler).on( "drag", thiz._dragNodeHandler ).on( "end", thiz._dragEndHandler ) )
                    .on( "dblclick", thiz._editNodeHandler )
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
                    .call(drag().on( "drag", thiz._dragRingHandler).on( "end", thiz._dragEndHandler ) )
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
                    .on( "dblclick", thiz._editRelationshipHandler)
                    .attr("transform", function(r: any) {
                        var angle = r.start.model.angleTo(r.end.model);
                        return "translate(" + r.start.model.ex() + "," + r.start.model.ey() + ") rotate(" + angle + ")";
                    } )
                    .attr("d", function(d: any) { return d.arrow.outline; } );
            });
        this.draw();

        let showCypherPanel: boolean = false;
        if (this.props.appModel.activeGraph && this.props.appModel.activeGraph.type == "neo4j") {
            showCypherPanel = true;
            this.startSimulation();
        }
        this.setState(prevState => ({
                scale: 1.0,
                showNodePanel: false,
                showRelationshipPanel: false,
                showCypherPanel: showCypherPanel
        }));
    }

    onUpdateActiveGraph(): void {
        this.setupSvg();
        this.initGraphEditor();
    }

    onRedrawGraph(): void {
        this.draw();
    }

    addNode() {
        this.props.appModel.addNode();
    }

    // bound to this via _dragStartHandler
    dragStart(__data__: any) {
        this.props.appModel.newNode = undefined;
    }

    dragNode(__data__: any)
    {
        var layoutNode: LayoutNode = __data__ as LayoutNode;
        var graphNode: Node = layoutNode.model as Node;
        graphNode.drag(event.dx, event.dy);
        this.draw();
    }

    dragRing(__data__: any)
    {
        this.props.appModel.onDragRing(__data__, event);
        this.draw();
    }

    // bound to this via _dragEndHandler
    dragEnd()
    {
        this.props.appModel.onDragEnd();
        this.draw();
    }

    editNode(__data__: any)
    {
        this.showNodePanel();
        this.props.appModel.activeNode = __data__.model as Node;
    }

    editRelationship(__data__: any)
    {
        this.showRelationshipPanel();
        this.props.appModel.activeRelationship = __data__.model as Relationship;
    }

    setupSvg() {
      if (svg) {
        select("svg").remove();
        svg = undefined;
        svg_g = undefined;
      }

      svgContainer = select("#svgContainer")

      svg = svgContainer.append("svg:svg");
      if (svg) {
          svg_g = svg
             .attr("class", "graphdiagram")
             .attr("id", "svgElement")
             .attr("width", "100%")
             .attr("height", "100%")
             .call(d3Zoom.zoom().on("zoom", function () {
                 if (svg_g) {
                     svg_g.attr("transform", event.transform);
                 }
             }))
             .on("dblclick.zoom", null)
             .append("g")
      }


      var svgElement = document.getElementById('svgElement');

      let x: number = svgElement ? svgElement.clientWidth / 2 : this.props.appModel.appDimensions.width / 2;
      let y: number = svgElement ? svgElement.clientHeight / 2 : this.props.appModel.appDimensions.height / 2;

      var w = 10,
      h = 10,
      s = '#999999',
      so = 0.5,
      sw = '1px';

      if (svg_g) {
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
    }

    generateSimData(diagram: Diagram): any {
        let layoutNodes: LayoutNode[] = diagram.layout.layoutModel.nodes;
        let layoutRelationships: LayoutRelationship[] = diagram.layout.layoutModel.relationships;

        let nodes: any[] = [];
        let links: any[] = [];
        let nodeDictionary: any = {};
        let nodeIndex: number = 0;

        layoutNodes.forEach((layoutNode: LayoutNode) => {
            let node: any = {};
            node.layoutNode = layoutNode;
            node.r = layoutNode.radius.insideRadius * 2;
            nodeDictionary[layoutNode.model.id] = nodeIndex++;
            nodes.push(node);
        });

        layoutRelationships.forEach((layoutRelationship: LayoutRelationship) => {
            let link: any = {};
            link.layoutRelationship = layoutRelationship;
            link.source = nodeDictionary[layoutRelationship.start.model.id];
            link.target = nodeDictionary[layoutRelationship.end.model.id];
            links.push(link);
        });

        return {
            nodes: nodes,
            links: links
        }
    }

    startSimulation(ticks?: number): void {
        simulationTickCount = 0;
        simulationMaxTicks = ticks || 100;
        // console.log(`startSimulation:`);
        var svgElement = document.getElementById('svgElement');
        let width: number = svgElement ? svgElement.clientWidth / 2 : this.props.appModel.appDimensions.width / 2;
        let height: number = svgElement ? svgElement.clientHeight / 2 : this.props.appModel.appDimensions.height / 2;

        // https://bl.ocks.org/wnghdcjfe/c2b04ee8430afa32ce76596daa4d8123
        // simulation = d3Force.forceSimulation()
        //     .force("link", d3Force.forceLink().id(function(d: any) { return d.index })) //.distance((d:any) => {return  d.source.r + d.target.r + 45}).strength(1))
        //     .force("collide",d3Force.forceCollide( function(d: any){return d.r + 25 }))
        //     .force("charge", d3Force.forceManyBody()) //.strength(-5000).distanceMin(500).distanceMax(2000))
        //     .force("center", d3Force.forceCenter(width, height))
        //     .force("y", d3Force.forceY(0.001))
        //     .force("x", d3Force.forceX(0.001))

        // from neo4j-browser
        // linkDistance = 45
        // d3force = d3.layout.force()
        // .linkDistance((relationship) -> relationship.source.radius + relationship.target.radius + linkDistance)
        // .charge(-1000)

        if (thiz.diagram) {
            simData = thiz.generateSimData(thiz.diagram);
        }

        if (svg_g) {
            simNodes = svg_g.select( "g.layer.nodes" )
                .selectAll("circle")
                .data(simData.nodes)

            svg_g.select( "g.layer.node_properties" )
                .attr( "display", "none");
            svg_g.select( "g.layer.relationships" )
                .attr( "display", "none");
            svg_g.select( "g.layer.relationship_properties" )
                .attr( "display", "none");
            svg_g.select( "g.layer.nodes" ).selectAll( "g.caption")
                .attr( "display", "none");
        }

        simulation = d3Force.forceSimulation(simData.nodes)
            .force("link", d3Force.forceLink(simData.links).id(function(d: any) { return d.index })) //.distance((d:any) => {return  d.source.r + d.target.r + 45}).strength(1))
            .force("charge", d3Force.forceManyBody().strength(-1500))
            .force('center', d3Force.forceCenter(width, height))
            .force("x", d3Force.forceX())
            .force("y", d3Force.forceY())
            .stop()
            .tick(300)

        // simulation
        //     .nodes(simData.nodes)
        //     .on("tick", thiz.ticked)
        //     .on("end", thiz.ended);

        // simulation.force("link")
        //     .links(simData.links);

        this.updateAndRedrawNodes();
    }

    ticked() {

        // simLinks
        //     .attr("x1", function(d: any) { return d.source.x; })
        //     .attr("y1", function(d: any) { return d.source.y; })
        //     .attr("x2", function(d: any) { return d.target.x; })
        //     .attr("y2", function(d: any) { return d.target.y; });

        // simNodes
        //     .attr("cx", function(d: any) { return d.x; })
        //     .attr("cy", function(d: any) { return d.y; });

        simulationTickCount++
        if (simulationTickCount >= simulationMaxTicks) {
            thiz.ended();
        }
    }

    ended() {
        simulation.stop();
        thiz.updateAndRedrawNodes();
    }

    updateAndRedrawNodes() {
        simData.nodes.forEach((node: any) => {
            node.layoutNode.x = node.x;
            node.layoutNode.y = node.y;
            node.layoutNode.model.x = node.x;
            node.layoutNode.model.y = node.y;
        });
        if (svg_g) {
            svg_g.select( "g.layer.node_properties" )
                .attr( "display", "block");
            svg_g.select( "g.layer.relationships" )
                .attr( "display", "block");
            svg_g.select( "g.layer.relationship_properties" )
                .attr( "display", "block");
            svg_g.select( "g.layer.nodes" ).selectAll( "g.caption")
                .attr( "display", "block");
        }
        this.draw();
    }

    draw()
    {
        if (this.diagram && svg_g) {
            svg_g
                .data([this.props.appModel.graphModel])
                .call(this.diagram.render);
        }
    }

    onButtonClicked(action: string): void {
        switch (action) {
            case 'addNode':
                this.addNode();
                break;
            case 'bubbles':
                if (this.diagram) {
                    this.diagram.toggleRenderPropertyBubblesFlag();
                    this.draw();
                }
                break;
            case 'forceLayout':
                this.startSimulation(100);
                break;
            case 'cypherPanel':
                if (this.props.appModel.activeGraph && this.props.appModel.activeGraph.type == "neo4j") {
                    this.setState(prevState => ({showCypherPanel: !prevState.showCypherPanel}));
                } else {
                    this.setState(prevState => ({showCypherPanel: false}));
                }
                break;
        }
    }

    changeInternalScale() {
        var temp: any = select("#internalScale").node();
        if (this.props.appModel.graphModel) {
            this.props.appModel.graphModel.internalScale = temp.value;
            this.setState({
                scale: temp.value
            });
            this.draw();
        }
    }

    hideCypherpPanel(): void {
        this.setState({
            showCypherPanel: false
        });
    }

    showNodePanel(): void {
        this.setState({
            showNodePanel: true,
            showRelationshipPanel: false
        });
    }

    hideNodePanel(): void {
        this.setState({
            showNodePanel: false
        });
    }

    showRelationshipPanel(): void {
        this.setState({
            showNodePanel: false,
            showRelationshipPanel: true
        });
    }

    hideRelationshipPanel(): void {
        this.setState({
            showRelationshipPanel: false
        });
    }

    render() {
        let nodePanel: JSX.Element | null = this.state.showNodePanel ? <NodePanel appModel={this.props.appModel} hideNodePanelCallback={this.hideNodePanel.bind(this)} /> : null;
        let relationshipPanel: JSX.Element | null = this.state.showRelationshipPanel ? <RelationshipPanel appModel={this.props.appModel} hideRelationshipPanelCallback={this.hideRelationshipPanel.bind(this)} /> : null;
        let cypherPanel: JSX.Element | null = this.state.showCypherPanel ? <CypherPanel appModel={this.props.appModel} /> : null;

        return (
            <div>
                <div id="svgContainer"></div>
                <div id="graphEditorButtons" className="well">
                    <ReactBootstrap.Button id="addNodeButton" variant={'default'} key={"addNode"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "addNode")}><FontAwesome name='plus'/> Node</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="bubblesButton" variant={'default'} key={"bubbles"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "bubbles")}>Bubbles</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="forceLayoutButton" variant={'default'} key={"forceLayout"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "forceLayout")}>Force</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="cypherPanelButton" variant={'default'} key={"cypherPanel"}
                        onClick={this.onButtonClicked.bind(this, "cypherPanel")}>SavedCyphers</ReactBootstrap.Button>
                    <input id="internalScale" type="range" min="0.1" max="5" value={this.state.scale} step="0.01" onChange={this.changeInternalScale.bind(this)}/>
                </div>
                <ToolsPanel appModel={this.props.appModel} />
                {cypherPanel}
                {nodePanel}
                {relationshipPanel}
            </div>
        );
    }
}
