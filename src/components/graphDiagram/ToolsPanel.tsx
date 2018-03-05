import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';
import ModalExport from './ModalExport';
import ModalFileDetails from './ModalFileDetails';

export interface ToolsPanelProps { appModel: AppModel }
export interface ToolsPanelState {
  graphName: string,
  graphScale: number,
  showModal: boolean,
  exportMode: string,
  showFileDetailsModal: boolean,
  fileDetailsMode: string,
  lastUpdateTime: number
}

export default class ToolsPanel extends React.Component<ToolsPanelProps, ToolsPanelState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        let graphName: string = "<filename>";
        if (this.props.appModel.activeGraph) {
            graphName = this.props.appModel.activeGraph.name;
        }
        this.setState({
            graphName: graphName,
            graphScale: 1.0,
            showModal: false,
            exportMode: "markup",
            showFileDetailsModal: false,
            fileDetailsMode: null
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
            case 'details':
                this.openModalFileDetails();
                break;
            case 'new':
                this.props.appModel.newGraph();
                this.openModalFileDetails();
                break;
            case 'save':
                this.props.appModel.saveActiveGraph();
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

    openModalFileDetails(mode?: string) {
        this.setState({ showFileDetailsModal: true, fileDetailsMode: mode });
    }

    onCloseModalFileDetails() {
        this.setState({ showFileDetailsModal: false, graphName: this.props.appModel.activeGraph.name });
    }

    onMenuItemSelected(value: string) {
        this.setState({ graphName: value});
        this.props.appModel.initGraphWithName(value);
    }

    renderFilenameMenuItems(): any {
        let menuItems: JSX.Element[] = [];
        this.props.appModel.graphSet.getGraphNames().forEach((graphName: string) => {
            let active: boolean = false;
            if (graphName == this.state.graphName) {
                active = true;
            }
            menuItems.push(
                <ReactBootstrap.MenuItem active={active} key={graphName} eventKey={graphName} onSelect={this.onMenuItemSelected.bind(this, graphName)}>{graphName}</ReactBootstrap.MenuItem>
            )
        });
        return menuItems;
    }

    renderFilenameSplitButton() {
        return (
            <ReactBootstrap.SplitButton
                bsStyle={"default"}
                title={this.state.graphName}
                key={`filename-splitbutton`}
                id={`filename-splitbutton`}
            >
                {this.renderFilenameMenuItems()}
            </ReactBootstrap.SplitButton>
        );
    }

    render() {
        return  <div className="editor-panel well" id="toolsPanel">
                  <div className="tools form-inline">
                    <ModalExport showModalProp={this.state.showModal} onClose={this.onCloseModalExport.bind(this)} appModel={this.props.appModel} exportMode={this.state.exportMode} />
                    <ModalFileDetails showModalProp={this.state.showFileDetailsModal} onClose={this.onCloseModalFileDetails.bind(this)} appModel={this.props.appModel} fileDetailsMode={this.state.fileDetailsMode} />
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

                    <div>
                        <label className="input-label">Open:</label>
                        {this.renderFilenameSplitButton()}
                        <datalist id="graphlist"></datalist>
                        <ReactBootstrap.Button bsStyle={'default'} key={"save"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                        <ReactBootstrap.Button bsStyle={'default'} key={"details"} style = {{width: 80}}
                          onClick={this.onButtonClicked.bind(this, "details")}>Details</ReactBootstrap.Button>
                        <ReactBootstrap.Button bsStyle={'default'} key={"new"} style = {{width: 80}}
                            onClick={this.onButtonClicked.bind(this, "new")}>New</ReactBootstrap.Button>
                    </div>
                  </div>
                </div>;
    }
}
