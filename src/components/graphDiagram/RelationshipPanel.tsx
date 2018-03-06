import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import Draggable from "react-draggable";

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

export interface RelationshipPanelProps { appModel: AppModel, hideRelationshipPanelCallback: any}
export interface RelationshipPanelState { type: string, properties: string }

export default class RelationshipPanel extends React.Component<RelationshipPanelProps, RelationshipPanelState> {

    private _setPropertiesHandler: any = this.setProperties.bind(this);

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        this.setState({
            type: "",
            properties: ""
        });
        this.props.appModel.on('updateActiveRelationship', this._setPropertiesHandler);
    }

    componentDidMount() {

    }

    componentWillUnmount() {
        this.props.appModel.removeListener('updateActiveRelationship', this._setPropertiesHandler);
    }

    setProperties(data: any): void {
        this.setState({
            type: data.label,
            properties: data.properties
        });
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
            case "reverse":
                this.props.appModel.reverseActiveRelationship();
                this.props.appModel.onRedraw();
                break;
            case "delete":
                this.props.appModel.deleteActiveRelationship();
                this.props.appModel.onRedraw();
                break;
            case 'cancel':
                break;
        }
        this.props.hideRelationshipPanelCallback();

    }

    save(): void {
        this.props.appModel.saveActiveRelationship(this.state.type, this.state.properties);
    }

    render() {
        let relationshipId: string = this.props.appModel.activeRelationship ? this.props.appModel.activeRelationship.id : ""
        return  <Draggable handle=".handle"><div className="editor-panel well" id="relationshipEditorPanel">
                    <h4 className="pull-left handle" style={{marginBottom:20}}>Relationship [{relationshipId}]</h4>
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
                    <ReactBootstrap.Button bsStyle={'warning'} key={"reverse"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "reverse")}>Reverse</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'danger'} key={"delete"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "delete")}>Delete</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'default'} key={"cancel"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "cancel")}>Cancel</ReactBootstrap.Button>

                </div></Draggable>;
    }
}
