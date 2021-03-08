import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import AppModel from '../../model/AppModel';

export interface ModalFileDetailsProps { showModalProp: boolean, onClose: any, appModel: AppModel, fileDetailsMode: string }
export interface ModalFileDetailsState { showModalState: boolean, graphName: string, graphNameStyle: any, connection: string }

export default class ModalFileDetails extends React.Component<ModalFileDetailsProps, ModalFileDetailsState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        this.setState(prevState => ({
                showModalState: false,
                graphName: "",
                graphNameStyle: {color: 'black'},
                connection: ""
        }));
    }

    componentWillUnmount() {

    }

    componentWillReceiveProps(nextProps: ModalFileDetailsProps) {
        // console.log(`ModalFileDetails: componentWillReceiveProps`, nextProps);
        let connection: string = `{}`;
        let graphName: string = "";
        switch (nextProps.fileDetailsMode) {
            case "details":
                connection = nextProps.appModel.activeGraph ? JSON.stringify(nextProps.appModel.activeGraph.connection, null, 2) : '';
                graphName = nextProps.appModel.activeGraph ? nextProps.appModel.activeGraph.name : '';
                break;
            case "newFile":
                graphName = "<filename>";
                connection = JSON.stringify({type: "file"}, null, 2);
                break;
            case "newNeo4j":
                graphName = "<filename>";
                connection = JSON.stringify({
                  "type": "neo4j",
                  "url": "bolt://localhost:7687",
                  "user": "neo4j",
                  "password": "",
                  "initialCypher": "MATCH (n)-[r]-(p), (q) return n,r,p, q limit 100"
                }, null, 2);
                break;
        }
        if (nextProps.showModalProp) {
            this.setState(prevState => ({
                showModalState: nextProps.showModalProp,
                graphName: graphName,
                graphNameStyle: {color: 'black'},
                connection: connection
            }));
        }
    }

    componentDidUpdate(nextProps: ModalFileDetailsProps, nextState: ModalFileDetailsState): void {
    }

    close(options?: any) {
        // console.log(`ModalFileDetails: close:`, options);
        this.setState(prevState => {
            this.props.onClose(options);
            return { showModalState: false, graphName: '', connection: ''};
        });
    }

    onHide() {
        this.close();
    }

    save() {
        let options: any = {};
        options.fileDetailsMode = this.props.fileDetailsMode;
        options.name = this.state.graphName;
        options.connection = JSON.parse(this.state.connection);
        // console.log(`ModalFileDetails: save:`, options);
        this.close(options);
    }

    onButtonClicked(action: string): void {
        switch (action) {
            case 'save':
                if (this.state.graphName != "<filename>") {
                    this.save();
                } else {
                    this.setState(prevState => ({graphNameStyle: {color: 'red'}}));
                }
                break;
            case 'cancel':
                this.close();
                break;
        }
    }

    handleInputChange(event: any) {
        let nativeEvent: any = event.nativeEvent;
        switch(nativeEvent.target.name) {
            case 'graphName':
                this.setState(prevState => ({ graphName: nativeEvent.target.value}));
                break;
            case 'connection':
                this.setState(prevState => ({ connection: nativeEvent.target.value}));
                break;
        }
    }

    render() {
        return  <ReactBootstrap.Modal show={this.state.showModalState} onHide={this.onHide.bind(this)}>
                      <ReactBootstrap.Modal.Header>
                          <ReactBootstrap.Modal.Title>Graph Details: {this.props.fileDetailsMode}</ReactBootstrap.Modal.Title>
                      </ReactBootstrap.Modal.Header>

                      <ReactBootstrap.Modal.Body>
                          <input name="graphName"  id="graphName" type="text" value={this.state.graphName}
                            onChange={this.handleInputChange.bind(this)} style={this.state.graphNameStyle}/>
                          <textarea name="connection" className="code" value={this.state.connection} onChange={this.handleInputChange.bind(this)}/>
                      </ReactBootstrap.Modal.Body>

                      <ReactBootstrap.Modal.Footer>
                          <ReactBootstrap.Button variant={'success'} key={"cancel"} style = {{width: 150}}
                              onClick={this.onButtonClicked.bind(this, "cancel")}>Cancel</ReactBootstrap.Button>
                          <ReactBootstrap.Button variant={'success'} key={"save"} style = {{width: 150}}
                              onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                      </ReactBootstrap.Modal.Footer>
                </ReactBootstrap.Modal>
    }
}
