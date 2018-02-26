import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

export interface RelationshipPanelProps { appModel: AppModel}
export interface RelationshipPanelState { type: string, properties: string, lastUpdateTime: number }

export default class RelationshipPanel extends React.Component<RelationshipPanelProps, RelationshipPanelState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {


        this.setState({
            type: "",
            properties: ""
        });

        this.props.appModel.on('updateActiveRelationship', (model: Model) => {
            let properties: string = "";
            if (this.props.appModel.activeRelationship.properties.listEditable().length > 0) {
              properties = this.props.appModel.activeRelationship.properties.listEditable().reduce(
                function(previous: string, property: any) {
                  return previous + property.key + ": " + property.value + "\n";
                }, ""
              );
            }

            this.setState({
                type: this.props.appModel.activeRelationship.caption,
                properties: properties
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
        console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'save':
                this.save();
                break;
        }
    }

    save(): void {
        let relationship: Relationship = this.props.appModel.activeRelationship;
        relationship.caption = this.state.type;
        relationship.properties.clearAll();
        this.state.properties.split("\n").forEach((line: string) => {
            let tokens = line.split(/: */);
            if (tokens.length === 2) {
                var key = tokens[0].trim();
                var value = tokens[1].trim();
                if (key.length > 0 && value.length > 0) {
                    relationship.properties.set(key, value);
                }
            }
        });
        this.props.appModel.saveActiveRelationship();
    }

    render() {
        return  <div className="editor-panel well" id="relationshipEditorPanel">
                    <h4 className="pull-left" style={{marginBottom:20}}>Relationship</h4>
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
                    <ReactBootstrap.Button bsStyle={'success'} key={"save"} style = {{width: 150}}
                        onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>

                </div>;
    }
}
