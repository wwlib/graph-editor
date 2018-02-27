import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';
import { ModalExport } from './ModalExport';

export interface ToolsPanelProps { appModel: AppModel }
export interface ToolsPanelState {
  graphName: string,
  graphScale: number,
  showModal: boolean,
  exportMode: string,
  lastUpdateTime: number
}

export default class ToolsPanel extends React.Component<ToolsPanelProps, ToolsPanelState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {

        this.setState({
            graphName: "example",
            graphScale: 1.0,
            showModal: false,
            exportMode: "markup"
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
            case 'exportCypher':
            		this.openModalExport("cypher");
            		break;
            case 'exportMarkup':
            		this.openModalExport("markup");
            		break;
            case 'exportD3':
            		this.openModalExport("d3");
            		break;
            case 'exportSVG':
            		this.openModalExport("svg");
            		break;
            case 'exportCSS':
            		this.openModalExport("css");
            		break;
            case 'reset':
                //
            		break;
        }
    }

    save(): void {
    }

    openModalExport(exportMode: string) {
        this.setState({ showModal: true, exportMode: exportMode });
    }

    onCloseModalExport() {
        this.setState({ showModal: false });
    }

    render() {
        return  <div className="editor-panel well" id="toolsPanel">
                  <div className="tools form-inline">
                      <ModalExport showModalProp={this.state.showModal} onClose={this.onCloseModalExport.bind(this)} appModel={this.props.appModel} exportMode={this.state.exportMode} />
                      <ReactBootstrap.Button bsStyle={'default'} key={"exportCypher"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "exportCypher")}>Cypher</ReactBootstrap.Button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"exportMarkup"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "exportMarkup")}>Markup</ReactBootstrap.Button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"exportD3"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "exportD3")}>D3</ReactBootstrap.Button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"exportSVG"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "exportSVG")}>SVG</ReactBootstrap.Button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"exportCSS"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "exportCSS")}>CSS</ReactBootstrap.Button>
                      <ReactBootstrap.Button bsStyle={'default'} key={"reset"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "reset")}>Reset</ReactBootstrap.Button>

                      <form id="graphNameForm">
                          Graph name:
                          <input name="graphName" id="graphName" type="text" value={this.state.graphName}
                              onChange={this.handleInputChange.bind(this)} list="graphlist" placeholder="graph name" />
                          <datalist id="graphlist"></datalist>
                          <button className="btn" id="load" type="submit">Load/New</button>
                      </form>
                  </div>
                </div>;
    }
}
