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

// for force simulation rather than referenceing through d3Force
const d3 = require('d3');

export interface GraphEditorProps {
    appModel: AppModel;
}
export interface GraphEditorState {
    scale: number;
    // linkDistance: number;
    // forceStrength: number;
    showNodePanel: boolean;
    showRelationshipPanel: boolean;
    showCypherPanel: boolean;
    lastUpdateTime: number;
}

let svgContainer: any;
let svg: Selection<Element, {}, any, any> | undefined;
let svg_g: Selection<Element, {}, any, any> | undefined;
let svgTransform: any;
let zoom: any;
let simulation: any;
let simData: any;
export default class GraphEditor extends React.Component<GraphEditorProps, GraphEditorState> {

    static SIM_ALPHA: number = .25
    static SIM_PRE_TICKS: number = 600
    public diagram: Diagram | undefined;

    private _dragStartHandler: any = this.dragStart.bind(this);
    private _dragEndHandler: any = this.dragEnd.bind(this);
    private _dragNodeHandler: any = this.dragNode.bind(this);
    private _dragRingHandler: any = this.dragRing.bind(this);

    private _editNodeHandler: any = this.editNode.bind(this);
    private _editRelationshipHandler: any = this.editRelationship.bind(this);
    private _onUpdateActiveGraphHandler: any = this.onUpdateActiveGraph.bind(this);
    private _onRedrawGraphHandler: any = this.onRedrawGraph.bind(this);
    private _keyStatus: any;
    private _dragged: boolean = false;

    componentWillMount() {
        this.setState({
            scale: 1.0,
            // linkDistance: 100,
            // forceStrength: 300,
            showNodePanel: false,
            showRelationshipPanel: false,
            showCypherPanel: false,
            lastUpdateTime: 0
        });

        this._keyStatus = {
            Meta: 'up',
            Shift: 'up',
        }
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('focus', this.onFocus);

        this.props.appModel.on('redrawGraph', this._onRedrawGraphHandler);
        this.props.appModel.on('updateActiveGraph', this._onUpdateActiveGraphHandler);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('focus', this.onFocus);

        this.props.appModel.removeListener('redrawGraph', this._onRedrawGraphHandler);
        this.props.appModel.removeListener('updateActiveGraph', this._onUpdateActiveGraphHandler);
    }

    componentWillReceiveProps(nextProps: GraphEditorProps) {
    }

    onKeyDown = (e: KeyboardEvent) => {
        // console.log(e);
        const key: string = e.key;
        switch (key) {
            case 'Meta':
                this._keyStatus.Meta = 'down';
                break;
            case 'Shift':
                this._keyStatus.Shift = 'down';
                break;
        }
    }

    onKeyUp = (e: KeyboardEvent) => {
        const key: string = e.key;
        switch (key) {
            case 'Meta':
                this._keyStatus.Meta = 'up';
                break;
            case 'Shift':
                this._keyStatus.Shift = 'up';
                break;
        }
    }

    onFocus = () => {
        this._keyStatus.Meta = 'up';
        this._keyStatus.Shift = 'up';
    }

    initGraphEditor(): void {
        this.diagram = new Diagram()
            .scaling(null)
            .overlay((layoutModel: LayoutModel, view: any) => {
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
                    .call(drag().on("start", this._dragStartHandler).on("drag", this._dragNodeHandler).on("end", this._dragEndHandler))
                    .on("dblclick", this._editNodeHandler)
                    .attr("r", function (node: LayoutNode) {
                        return node.radius.outside();
                    })
                    .attr("stroke", "none")
                    .attr("fill", "rgba(255, 255, 255, 0)")
                    .attr("cx", function (node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ex();
                    })
                    .attr("cy", function (node: LayoutNode) {
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
                    .call(drag().on("drag", this._dragRingHandler).on("end", this._dragEndHandler))
                    .attr("r", function (node: LayoutNode) {
                        return node.radius.outside() + 5;
                    })
                    .attr("fill", "none")
                    .attr("stroke", "rgba(255, 255, 255, 0)")
                    .attr("stroke-width", "10px")
                    .attr("cx", function (node: LayoutNode) {
                        let graphNode: Node = node.model as Node;
                        return graphNode.ex();
                    })
                    .attr("cy", function (node: LayoutNode) {
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
                    .on("dblclick", this._editRelationshipHandler)
                    .attr("transform", function (r: any) {
                        var angle = r.start.model.angleTo(r.end.model);
                        return "translate(" + r.start.model.ex() + "," + r.start.model.ey() + ") rotate(" + angle + ")";
                    })
                    .attr("d", function (d: any) { return d.arrow.outline; });
            });
        this.draw();

        let showCypherPanel: boolean = false;
        if (this.props.appModel.activeGraph && this.props.appModel.activeGraph.type == "neo4j") {
            showCypherPanel = true;
            this.startSimulation(GraphEditor.SIM_PRE_TICKS, false);
        }
        this.setState(prevState => ({
            scale: 1.0,
            // linkDistance: 100,
            // forceStrength: 300,
            showNodePanel: false,
            showRelationshipPanel: false,
            showCypherPanel: showCypherPanel
        }));
    }

    onUpdateActiveGraph(): void {
        this.disposeSimulation()
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
        this._dragged = false
    }

    dragNode(__data__: any) {
        this._dragged = true
        var layoutNode: LayoutNode = __data__ as LayoutNode;
        var graphNode: Node = layoutNode.model as Node;
        graphNode.drag(event.dx, event.dy);
        // hacky way to set fx,fy
        // TODO fix this (re-write GraphEditor.tsx)
        const simNodeId = +layoutNode.model.id
        let simNode
        if (simData) {
            simNode = simData.nodes.filter(n => +n.layoutNode.model.id === +simNodeId)[0]
            if (simNode) {
                // simNode.x = graphNode.x
                // simNode.y = graphNode.y
                simNode.fx = graphNode.x
                simNode.fy = graphNode.y
            }
        }
        // console.log(`dragNode:`, layoutNode, graphNode, simData, simNodeId, simNode)
        this.props.appModel.activeGraphFixedNodePositions[layoutNode.model.id] = { fx: graphNode.x, fy: graphNode.y };
        if (simulation) {
            simulation.alpha(GraphEditor.SIM_ALPHA).restart();
        } else {
            this.updateAndRedrawNodes();
        }
    }

    dragRing(__data__: any) {
        this.props.appModel.onDragRing(__data__, event);
        this.updateAndRedrawNodes();
    }

    // bound to this via _dragEndHandler
    dragEnd(__data__: any) {
        this.props.appModel.onDragEnd();
        var layoutNode: LayoutNode = __data__ as LayoutNode;
        var graphNode: Node = layoutNode.model as Node;
        graphNode.dragEnd() // important to reset drag parameters internal to Node
        if (!this._dragged) {
            // hacky way to set fx,fy
            // TODO fix this (re-write GraphEditor.tsx)
            const simNodeId = +graphNode.id
            let simNode
            if (simData) {
                simNode = simData.nodes.filter(n => +n.layoutNode.model.id === +simNodeId)[0]
                if (simNode) {
                    delete simNode.fx
                    delete simNode.fy
                }
            }
        }
        this.updateAndRedrawNodes();
        if (simulation) simulation.alpha(GraphEditor.SIM_ALPHA).restart();
    }

    editNode(__data__: any) {
        // console.log(this._keyStatus);
        if (this._keyStatus.Meta !== 'down') {
            this.showNodePanel();
            this.props.appModel.activeNode = __data__.model as Node;
        } else {
            this.props.appModel.activeNode = __data__.model as Node;
            this.props.appModel.expandActiveNode();
        }
    }

    editRelationship(__data__: any) {
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
        zoom = d3Zoom.zoom().on("zoom", function () {
            if (svg_g) {
                svgTransform = event.transform
                svg_g.attr("transform", svgTransform);
            }
        })

        if (svg) {
            svg_g = svg
                .attr("class", "graphdiagram")
                .attr("id", "svgElement")
                .attr("width", "100%")
                .attr("height", "100%")
                .call(zoom)
                .on("dblclick.zoom", null)
                .append("g")

            if (svg_g && svgTransform) {
                svg.call(zoom.transform, svgTransform);
                svg_g.attr("transform", svgTransform)
            } else {
                console.log(`NOT setting svgTransform`, svgTransform)
            }
        }


        var svgElement = document.getElementById('svgElement');

        let x: number = svgElement ? svgElement.clientWidth / 2 : this.props.appModel.appDimensions.width / 2;
        let y: number = svgElement ? svgElement.clientHeight / 2 : this.props.appModel.appDimensions.height / 2;
        var w = 10,
            h = 10,
            s = '#999999',
            so = 1.0, // 0.5,
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

            svg_g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 500)
                .style('stroke', s)
                .style('stroke-opacity', so)
                .style('stroke-width', sw)
                .style('fill', 'none')
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

            const fixedPosition: any = this.props.appModel.activeGraphFixedNodePositions[layoutNode.model.id];
            if (fixedPosition) {
                node.fx = fixedPosition.fx;
                node.fy = fixedPosition.fy;
            }
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

    disposeSimulation() {
        if (simulation) {
            simulation.stop()
            const nodes = [];
            simulation.nodes(nodes);
            simulation = undefined
        }
    }

    startSimulation(preTicks: number = 100, forceNodeRepositioning: boolean = false): void {
        console.log(`startSimulation`)
        this.disposeSimulation()
        var svgElement = document.getElementById('svgElement');
        let centerX: number = svgElement ? svgElement.clientWidth / 2 : this.props.appModel.appDimensions.width / 2;
        let centerY: number = svgElement ? svgElement.clientHeight / 2 : this.props.appModel.appDimensions.height / 2;

        if (forceNodeRepositioning) {
            console.log(`forceNodeRepositioning: ${forceNodeRepositioning}`);
            this.resetFixedNodes()
        }

        if (this.diagram) {
            simData = this.generateSimData(this.diagram);
        }

        if (svg_g) {
            svg_g.select("g.layer.nodes")
                .selectAll("circle")
                .data(simData.nodes)

            svg_g.select("g.layer.node_properties")
                .attr("display", "none");
            svg_g.select("g.layer.relationships")
                .attr("display", "none");
            svg_g.select("g.layer.relationship_properties")
                .attr("display", "none");
            svg_g.select("g.layer.nodes").selectAll("g.caption")
                .attr("display", "none");
        }

        simulation = d3
            .forceSimulation()
            .nodes(simData.nodes)
            // .force("radial", d3.forceRadial(500, centerX, centerY))
            .force("charge", d3.forceManyBody().strength(-300)) //.strength(-this.state.forceStrength)) // .strength(-5000).distanceMin(500).distanceMax(2000)) // .strength(-1500)) 
            .force('center', d3.forceCenter(centerX, centerY))
            .force("link", d3.forceLink(simData.links).id((d: any) => d.index).distance(this.calculateLinkDistance).strength(0.1)) //.distance(this.calculateLinkDistance)) //.strength(0.1))
            .force('collision', d3.forceCollide().radius((d: any) => {
                return d.r;
            }))
            .stop()
            .on("end", () => {
                console.log('simulation: end');
                this.ended()
            })

        for (let i = 0; i < preTicks; i++) {
            simulation.tick();
        }
        // this.ticked();
        simulation.on('tick', this.ticked.bind(this))
        this.restartSimulation()
    }

    calculateLinkDistance(d: any) {
        // let distance = 100;
        // console.log(`calculateLinkDistance:`, d)
        let distance = (d.source.r + d.target.r) + 45
        return distance
    }

    restartSimulation() {
        if (simulation) simulation.alpha(GraphEditor.SIM_ALPHA).restart();
    }

    resetFixedNodes() {
        this.props.appModel.activeGraphFixedNodePositions = {};
        if (simData) {
            simData.nodes.forEach(node => {
                delete node.fx
                delete node.fy
            })
        }
    }

    ticked() {
        this.updateAndRedrawNodes();
    }

    ended() {
        if (simulation) simulation.stop();
        this.updateAndRedrawNodes();
        console.log(`ended:`, simData)
    }

    updateAndRedrawNodes() {
        if (simData) {
            simData.nodes.forEach((node: any) => {
                node.layoutNode.x = node.x;
                node.layoutNode.y = node.y;
                node.layoutNode.model.x = node.x;
                node.layoutNode.model.y = node.y;
            });
        }
        if (svg_g) {
            svg_g.select("g.layer.node_properties")
                .attr("display", "block");
            svg_g.select("g.layer.relationships")
                .attr("display", "block");
            svg_g.select("g.layer.relationship_properties")
                .attr("display", "block");
            svg_g.select("g.layer.nodes").selectAll("g.caption")
                .attr("display", "block");
        }
        this.draw();
    }

    draw() {
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
                    this.updateAndRedrawNodes();
                }
                break;
            case 'forceLayout':
                if (this._keyStatus.Shift === 'down') {
                    this.startSimulation(GraphEditor.SIM_PRE_TICKS, true);
                } else if (simulation) {
                    // this.resetFixedNodes()
                    this.restartSimulation()
                } else {
                    this.startSimulation(GraphEditor.SIM_PRE_TICKS, false);
                }

                break;
            case 'cypherPanel':
                if (this.props.appModel.activeGraph && this.props.appModel.activeGraph.type == "neo4j") {
                    this.setState(prevState => ({ showCypherPanel: !prevState.showCypherPanel }));
                } else {
                    this.setState(prevState => ({ showCypherPanel: false }));
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
            this.updateAndRedrawNodes();
        }
    }

    // changeLinkDistance() {
    //     var temp: any = select("#linkDistance").node();
    //     this.setState({
    //         linkDistance: temp.value
    //     });
    //     // this.updateAndRedrawNodes();
    //     this.startSimulation(GraphEditor.SIM_PRE_TICKS, false);
    // }

    // changeForceStrength() {
    //     var temp: any = select("#forceStrength").node();
    //     this.setState({
    //         forceStrength: temp.value
    //     });
    //     // this.updateAndRedrawNodes();
    //     simulation.stop()
    //     this.startSimulation(GraphEditor.SIM_PRE_TICKS, false);
    // }

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
                    <ReactBootstrap.Button id="addNodeButton" variant={'default'} key={"addNode"} style={{ width: 80 }}
                        onClick={this.onButtonClicked.bind(this, "addNode")}><FontAwesome name='plus' /> Node</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="bubblesButton" variant={'default'} key={"bubbles"} style={{ width: 80 }}
                        onClick={this.onButtonClicked.bind(this, "bubbles")}>Bubbles</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="forceLayoutButton" variant={'default'} key={"forceLayout"} style={{ width: 80 }}
                        onClick={this.onButtonClicked.bind(this, "forceLayout")}>Force</ReactBootstrap.Button>
                    <ReactBootstrap.Button id="cypherPanelButton" variant={'default'} key={"cypherPanel"}
                        onClick={this.onButtonClicked.bind(this, "cypherPanel")}>SavedCyphers</ReactBootstrap.Button>
                    <input id="internalScale" type="range" min="0.1" max="5" value={this.state.scale} step="0.01" onChange={this.changeInternalScale.bind(this)} />
                    {/* <input id="forceStrength" type="range" min="100" max="1000" value={this.state.forceStrength} step="1" onChange={this.changeForceStrength.bind(this)} />
                    <input id="linkDistance" type="range" min="10" max="1000" value={this.state.linkDistance} step="1" onChange={this.changeLinkDistance.bind(this)} /> */}
                </div>
                <ToolsPanel appModel={this.props.appModel} />
                {cypherPanel}
                {nodePanel}
                {relationshipPanel}
            </div>
        );
    }
}
