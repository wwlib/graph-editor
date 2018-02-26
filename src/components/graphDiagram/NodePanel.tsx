import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

export interface NodePanelProps { appModel: AppModel}
export interface NodePanelState { type: string, properties: string, lastUpdateTime: number }

export default class NodePanel extends React.Component<NodePanelProps, NodePanelState> {

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {


        this.setState({
            type: "",
            properties: ""
        });

        this.props.appModel.on('updateActiveNode', (model: Model) => {
            let properties: string = "";
            if (this.props.appModel.activeNode.properties.listEditable().length > 0) {
              properties = this.props.appModel.activeNode.properties.listEditable().reduce(
                function(previous: string, property: any) {
                  return previous + property.key + ": " + property.value + "\n";
                }, ""
              );
            }

            this.setState({
                type: this.props.appModel.activeNode.caption,
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
        let node: Node = this.props.appModel.activeNode;
        node.caption = this.state.type;
        node.properties.clearAll();
        this.state.properties.split("\n").forEach((line: string) => {
            let tokens = line.split(/: */);
            if (tokens.length === 2) {
                var key = tokens[0].trim();
                var value = tokens[1].trim();
                if (key.length > 0 && value.length > 0) {
                    node.properties.set(key, value);
                }
            }
        });
        this.props.appModel.saveActiveNode();
    }

    render() {
        return  <div className="editor-panel well" id="nodeEditorPanel">
                    <h4 className="pull-left" style={{marginBottom:20}}>Node [{this.props.appModel.activeNode.id}]</h4>
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
