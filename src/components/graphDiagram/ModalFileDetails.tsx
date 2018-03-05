import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import AppModel from '../../model/AppModel';

const shell = require('electron').shell;

export interface ModalFileDetailsProps { showModalProp: boolean, onClose: any, appModel: AppModel, fileDetailsMode: string }
export interface ModalFileDetailsState { showModalState: boolean, graphName: string, connection: string }

export default class ModalFileDetails extends React.Component<ModalFileDetailsProps, ModalFileDetailsState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {

        this.setState({
                showModalState: false,
                graphName: "",
                connection: ""
            }, () => {
        });
    }

    componentWillUnmount() {

    }

    componentWillReceiveProps(nextProps: ModalFileDetailsProps) {
        // console.log(`ModalFileDetails: componentWillReceiveProps`, nextProps);
        if (nextProps.appModel) {
            this.setState({
                showModalState: nextProps.showModalProp,
                graphName: nextProps.appModel.activeGraph.name,
                connection: JSON.stringify(nextProps.appModel.activeGraph.connection, null, 2)
            }, () => {
                // console.log(this.state.exportedData);
            });
        }
    }

    componentDidUpdate(nextProps: ModalFileDetailsProps, nextState: ModalFileDetailsState): void {
        // console.log(`ModalFileDetails: componentDidUpdate`);
    }

    close() {
        // console.log(`ModalFileDetails: close`);
        this.setState({ showModalState: false, graphName: '', connection: ''}, () => {
            this.props.onClose();
        });
    }

    onHide() {
        // console.log(`ModalFileDetails: onHide`);
        this.close();
    }

    save() {
        console.log(`ModalFileDetails: save: ${this.props.fileDetailsMode}`);
        this.props.appModel.activeGraph.name = this.state.graphName;
        this.props.appModel.activeGraph.connection = JSON.parse(this.state.connection);
        this.close();
    }

    onButtonClicked(action: string): void {
        // console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'save':
                this.save();
                break;
            case 'cancel':
                this.close();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    handleInputChange(event: any) {
        let nativeEvent: any = event.nativeEvent;
        // console.log(`handleInputChange: ${nativeEvent.target.name}`); // ${nativeEvent.target.value}`, this.state);
        switch(nativeEvent.target.name) {
            case 'graphName':
                this.setState({ graphName: nativeEvent.target.value});
                break;
            case 'connection':
                this.setState({ connection: nativeEvent.target.value});
                break;
        }
    }

    render() {
        return  <ReactBootstrap.Modal show={this.state.showModalState} onHide={this.onHide.bind(this)}>
                      <ReactBootstrap.Modal.Header>
                          <ReactBootstrap.Modal.Title>File Details: {this.props.fileDetailsMode}</ReactBootstrap.Modal.Title>
                      </ReactBootstrap.Modal.Header>

                      <ReactBootstrap.Modal.Body>
                          <input name="graphName" id="graphName" type="text" value={this.state.graphName}
                            onChange={this.handleInputChange.bind(this)} list="graphlist" placeholder="graph name" />
                          <textarea name="connection" className="code" value={this.state.connection} onChange={this.handleInputChange.bind(this)}/>
                      </ReactBootstrap.Modal.Body>

                      <ReactBootstrap.Modal.Footer>
                          <ReactBootstrap.Button bsStyle={'success'} key={"cancel"} style = {{width: 150}}
                              onClick={this.onButtonClicked.bind(this, "cancel")}>Cancel</ReactBootstrap.Button>
                          <ReactBootstrap.Button bsStyle={'success'} key={"save"} style = {{width: 150}}
                              onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                      </ReactBootstrap.Modal.Footer>
                </ReactBootstrap.Modal>
    }
}
