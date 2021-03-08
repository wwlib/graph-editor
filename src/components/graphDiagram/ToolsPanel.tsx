import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import AppModel from '../../model/AppModel';
import Graph from '../../model/Graph';
import ModalExport from './ModalExport';
import ModalFileDetails from './ModalFileDetails';

console.log(process.env.REACT_APP_MODE)
const dialog = require('electron').remote.dialog;

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

    // private _onUpdateActiveGraphHandler: any = this.onUpdateActiveGraph.bind(this);

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        let graphName: string = "<filename>";
        if (this.props.appModel.activeGraph) {
            graphName = this.props.appModel.activeGraph.name;
        }
        this.setState(prevState => ({
            graphName: graphName,
            graphScale: 1.0,
            showModal: false,
            exportMode: "markup",
            showFileDetailsModal: false,
            fileDetailsMode: ''
        }));

        // this.props.appModel.on('updateActiveGraph', this._onUpdateActiveGraphHandler);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
        // this.props.appModel.removeListener('updateActiveGraph', this._onUpdateActiveGraphHandler);
    }

    onUpdateActiveGraph(): void {
        this.setState(prevState => ({
            graphName: this.props.appModel.activeGraph ? this.props.appModel.activeGraph.name : '',
            graphScale: this.props.appModel.activeGraph ? this.props.appModel.activeGraph.scale : 1.0
        }));
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
            case 'exportGraph':
        		this.openModalExport("graph");
                break;
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
            case 'exportDot':
        		this.openModalExport("dot");
        		break;
            case 'details':
                this.openModalFileDetails("details");
                break;
            case 'newFile':
                this.openModalFileDetails("newFile");
                break;
            case 'newNeo4j':
                this.openModalFileDetails("newNeo4j");
                break;
            case 'import':
               this.importGraphFile();
               break;
            case 'save':
                this.save();
        		break;
        }
    }

    save(): void {
        if (this.state.graphName != '<filename>') {
            this.props.appModel.saveActiveGraph();
        } else {
            this.openModalFileDetails("details");
        }
    }

    openModalExport(exportMode: string) {
        this.setState(prevState => ({ showModal: true, exportMode: exportMode }));
    }

    onCloseModalExport() {
        // console.log(`ToolsPanel: onCloseModalExport:`);
        this.setState(prevState => ({ showModal: false }));
    }

    openModalFileDetails(mode: string = "") {
        this.setState(prevState => ({ showFileDetailsModal: true, fileDetailsMode: mode }));
    }

    importGraphFile(): void {
        dialog.showOpenDialog((fileNames: string[]) => {
            // fileNames is an array that contains all the selected
            if(fileNames === undefined){
                console.log("No file selected");
                return;
            }
            if (fileNames[0] && this.props.appModel) {
                this.props.appModel.initGraphWithPath(fileNames[0])
                    .then((graph: Graph) => {
                        if (this.props.appModel && this.props.appModel.graphSet) {
                            this.props.appModel.graphSet.addGraph(graph);
                            this.props.appModel.graphSet.saveGraph(graph);
                            this.setState(prevState => ({ graphName: graph.name }));
                        }

                    })
                    .catch((err: any) => {
                        console.log(err);
                    })
            }
        });
    }

    onCloseModalFileDetails(options?: any) {
        // console.log(`ToolsPanel: onCloseModalFileDetails:`, options);
        if (options) {
            if (options.fileDetailsMode == "newFile" || options.fileDetailsMode == "newNeo4j") { //save
                this.props.appModel.newBlankGraph(options);
                this.setState(prevState => ({ showFileDetailsModal: false, graphName: options.name }));
            } else { //saveAs
                if (this.props.appModel.activeGraph && this.props.appModel.graphSet) {
                    this.props.appModel.activeGraph.name = options.name;
                    // this.props.appModel.activeGraph.connection = options.connection;
                    this.props.appModel.graphSet.addGraph(this.props.appModel.activeGraph); //TODO if name hass changed, the graph should be copied
                    this.props.appModel.graphSet.saveGraph(this.props.appModel.activeGraph);
                    this.setState(prevState => ({ showFileDetailsModal: false, graphName: options.name }));
                } else {
                    this.setState(prevState => ({ showFileDetailsModal: false}));
                }
            }
        } else {
            this.setState(prevState => ({ showFileDetailsModal: false}));
        }

    }

    onMenuItemSelected(value: string) {
        this.setState({ graphName: value});
        this.props.appModel.initGraphWithName(value);
    }

    renderFilenameMenuItems(): any {
        let menuItems: JSX.Element[] = [];
        if (this.props.appModel.graphSet) {
            this.props.appModel.graphSet.getGraphNames().forEach((graphName: string) => {
                let active: boolean = false;
                if (graphName == this.state.graphName) {
                    active = true;
                }
                menuItems.push(
                    <ReactBootstrap.Dropdown.Item active={active} key={graphName} eventKey={graphName} onSelect={this.onMenuItemSelected.bind(this, graphName)}>{graphName}</ReactBootstrap.Dropdown.Item>
                )
            });
        }
        return menuItems;
    }

    renderFilenameSplitButton() {
        return (
            <ReactBootstrap.SplitButton
                variant={"default"}
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
                  <div id="toolsExport" className="tools form-inline">
                    <ModalExport showModalProp={this.state.showModal} onClose={this.onCloseModalExport.bind(this)} appModel={this.props.appModel} exportMode={this.state.exportMode} />
                    <ModalFileDetails showModalProp={this.state.showFileDetailsModal} onClose={this.onCloseModalFileDetails.bind(this)} appModel={this.props.appModel} fileDetailsMode={this.state.fileDetailsMode} />
                    <ReactBootstrap.Button variant={'default'} key={"exportGraph"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportGraph")}>Graph</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"exportCypher"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportCypher")}>Cypher</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"exportMarkup"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportMarkup")}>Markup</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"exportD3"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportD3")}>D3</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"exportSVG"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportSVG")}>SVG</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"exportCSS"} style = {{width: 80}}
                      onClick={this.onButtonClicked.bind(this, "exportCSS")}>CSS</ReactBootstrap.Button>
                  <ReactBootstrap.Button variant={'default'} key={"exportDot"} style = {{width: 80}}
                    onClick={this.onButtonClicked.bind(this, "exportDot")}>Dot</ReactBootstrap.Button>
                </div>
                <div id="toolsFile" className="tools">
                    <label className="input-label">Open:</label>
                    {this.renderFilenameSplitButton()}
                    <datalist id="graphlist"></datalist>
                    <ReactBootstrap.Button variant={'default'} key={"save"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"details"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "details")}>Details</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"newFile"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "newFile")}>New File</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"newNeo4j"} style = {{width: 100}}
                        onClick={this.onButtonClicked.bind(this, "newNeo4j")}>New Neo4j</ReactBootstrap.Button>
                    <ReactBootstrap.Button variant={'default'} key={"import"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "import")}>Import</ReactBootstrap.Button>
                </div>
                </div>;
    }
}
