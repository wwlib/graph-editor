import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

export interface ToolsPanelProps { appModel: AppModel}
export interface ToolsPanelState {
  graphName: string,
  graphScale: number,
  lastUpdateTime: number
}

export default class ToolsPanel extends React.Component<ToolsPanelProps, ToolsPanelState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {


        this.setState({
            graphName: "example",
            graphScale: 1.0
        });

        this.props.appModel.on('updateActiveGraph', (model: Model) => {

            this.setState({
                graphName: this.props.appModel.activeGraph.name,
                graphScale: this.props.appModel.activeGraph.scale
            });
            this.setState(({lastUpdateTime}) => ({lastUpdateTime: new Date().getTime()}));
        });
    }

    componentDidMount() {

    }

    handleInputChange(event: any) {
        let nativeEvent: any = event.nativeEvent;
        // console.log(`handleInputChange: ${nativeEvent.target.name} ${nativeEvent.target.value}`, this.state);
        switch(nativeEvent.target.name) {
            case 'graphName':
                this.setState({ graphName: nativeEvent.target.value});
                break;
        }
    }

    handleSubmit(event: any) {
        event.preventDefault();
    }

    onButtonClicked(action: string): void {
        console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'save':
                this.save();
                break;
        }
    }

    save(): void {

    }

    render() {
        return  <div className="editor-panel well" id="toolsPanel">
                  <div className="tools form-inline">
                      <button className="btn" id="add_node_button"><i className="icon-plus"></i> Node</button>
                      <button className="btn" id="exportCypherButton">Export Cypher</button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"save"} style = {{width: 150}}
                          onClick={this.onButtonClicked.bind(this, "exportMarkup")}>Export Markup</ReactBootstrap.Button>
                      <a className="btn" id="downloadSvgButton" download="graph-diagram.svg">Download SVG</a>
                      <button className="btn" id="editStyleButton">Edit Style</button>
                      <label htmlFor="internalScale">Scale</label>
                      <input id="internalScale" type="range" min="0.1" max="5" value="1" step="0.01" onChange={this.handleInputChange.bind(this)}/>
                      <form id="graphNameForm">
                          Graph name:
                          <input id="graphName" type="text" value={this.state.graphName}
                              onChange={this.handleInputChange.bind(this)} list="graphlist" placeholder="graph name" />
                          <datalist id="graphlist"></datalist>
                          <button className="btn" id="load" type="submit">Load/New</button>
                          <button className="btn" id="resetGraph">Reset Graph</button>
                          <button className="btn" id="toggleBubbles">Toggle Bubbles</button>
                      </form>
                  </div>
                </div>;
    }
}
