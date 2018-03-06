import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import Draggable from "react-draggable";

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

export interface NodePanelProps { appModel: AppModel, hideNodePanelCallback: any}
export interface NodePanelState { type: string, properties: string, lastUpdateTime: number }

export default class NodePanel extends React.Component<NodePanelProps, NodePanelState> {

    private _oldLabel: string;
    private _setPropertiesHandler: any = this.setProperties.bind(this);

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        // console.log(`nodePanel: componentWillMount:`, this);
        this._oldLabel = null;
        this.setState({
            type: "",
            properties: ""
        });

        this.props.appModel.on('updateActiveNode', this._setPropertiesHandler);
    }

    setProperties(data: any): void {
        this._oldLabel = data.label;
        this.setState({
            type: data.label,
            properties: data.properties
        });
    }

    componentDidMount() {

    }

    componentWillUnmount() {
        this.props.appModel.removeListener('updateActiveNode', this._setPropertiesHandler);
    }

    handleInputChange(event: any) {
        let nativeEvent: any = event.nativeEvent;
        // console.log(`handleInputChange: ${nativeEvent.target.name} ${nativeEvent.target.value}`, this.state);
        switch(nativeEvent.target.name) {
            case 'type':
                this.setState({ type: nativeEvent.target.value});
                break;
            case 'properties':
                this.setState({ properties: nativeEvent.target.value});
                break;
        }
    }

    handleSubmit(event: any) {
      event.preventDefault();
    }

    onButtonClicked(action: string): void {
        // console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'save':
                this.save();
                this.props.appModel.onRedraw();
                break;
            case 'delete':
                this.props.appModel.deleteActiveNode();
                this.props.appModel.onRedraw();
                break;
            case 'cancel':
                break;
        }
        this.props.hideNodePanelCallback();
    }

    save(): void {
        this.props.appModel.saveActiveNode(this.state.type, this.state.properties, this._oldLabel);
    }

    render() {
        let nodeId: string = this.props.appModel.activeNode ? this.props.appModel.activeNode.id : ""
        return  <Draggable handle=".handle"><div className="editor-panel well" id="nodeEditorPanel">
                    <h4 className="pull-left handle" style={{marginBottom:20}}>Node [{nodeId}]</h4>
                    <div className="clearfix"></div>
                    <ReactBootstrap.Table striped bordered condensed hover style = {{width: 400}}>
                        <tbody>
                            <tr>
                            <td>type:</td>
                            <td>
                            <input name="type" value={this.state.type} onChange={this.handleInputChange.bind(this)} style={{width: 300}} />
                            </td>
                            </tr>
                            <tr>
                            <td>properties:</td>
                            <td>
                            <textarea name="properties" value={this.state.properties} onChange={this.handleInputChange.bind(this)} style={{width: 300, height: 100}} />
                            </td>
                            </tr>
                        </tbody>
                    </ReactBootstrap.Table>
                    <ReactBootstrap.Button bsStyle={'success'} key={"save"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'danger'} key={"delete"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "delete")}>Delete</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'default'} key={"cancel"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "cancel")}>Cancel</ReactBootstrap.Button>
                </div></Draggable>
    }
}
