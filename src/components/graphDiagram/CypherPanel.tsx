import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import * as ReactList from 'react-list';
import Draggable from "react-draggable";

import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';
import AppModel from '../../model/AppModel';

import Neo4jGraphConfig, { SavedCypher } from '../../model/Neo4jGraphConfig';

export interface CypherPanelProps { appModel: AppModel}
export interface CypherPanelState { activeCypher: SavedCypher, selectedCyperIndex: number, status: string, visible: boolean, lastUpdateTime: number }

export default class CypherPanel extends React.Component<CypherPanelProps, CypherPanelState> {

    private _savedCypherList: SavedCypher[];
    private _savedCypherListLength: number;
    private _onCypherExecutedHandler: any = this.onCypherExecuted.bind(this);
    private _onCypherExecutionErrorHandler: any = this.onCypherExecutionErrorHandler.bind(this);

    constructor(props: any) {
        super(props);
    }

    componentWillMount() {
        this.setState({
            activeCypher: {name: "", cypher: ""},
            selectedCyperIndex: -1,
            status: "",
            visible: true
        });

        this.props.appModel.on('onCypherExecuted', this._onCypherExecutedHandler);
        this.props.appModel.on('onCypherExecutionError', this._onCypherExecutionErrorHandler);
    }

    componentDidMount() {

    }

    componentWillUnmount() {
        this.props.appModel.removeListener('onCypherExecuted', this._onCypherExecutedHandler);
        this.props.appModel.removeListener('onCypherExecutionError', this._onCypherExecutionErrorHandler);
    }

    onCypherExecuted(data: any): void {
        this.setState({
            status: JSON.stringify(data)
        });
    }

    onCypherExecutionErrorHandler(error: any): void {
        this.setState({
            status: error
        });
    }

    onCypherExecutionHandler(): void {

    }

    handleInputChange(event: any) {
        let nativeEvent: any = event.nativeEvent;
        // console.log(`handleInputChange: ${nativeEvent.target.name} ${nativeEvent.target.value}`, this.state);
        let savedCypher: SavedCypher = this.state.activeCypher;
        switch(nativeEvent.target.name) {
            case 'cypherName':
                savedCypher.name = nativeEvent.target.value
                break;
            case 'cypher':
                savedCypher.cypher = nativeEvent.target.value
                break;
            case 'cypherStatus':
                this.setState({
                    status: nativeEvent.target.value,
                });
                break;
        }
        this.setState({ activeCypher: savedCypher});
    }

    handleSubmit(event: any) {
      event.preventDefault();
    }

    onButtonClicked(action: string): void {
        // console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'run':
                this.executeCypher(this.state.activeCypher);
                break;
            case 'save':
                this.saveSelectedCypher(this.state.activeCypher);
                break;
            case 'delete':
                this.deleteSlectedCypher(this.state.activeCypher.index);
                    break;
        }
    }

    onItemClicked(index: number): void {
        // console.log(`onButtonClicked: ${index}`);
        let item: SavedCypher = this.props.appModel.getSavedCypherList()[index];
        this.setState({
            activeCypher: item,
            selectedCyperIndex: index
        });
    }

    executeCypher(activeCypher: SavedCypher): void {
        this.props.appModel.executeCypher(activeCypher.cypher);
    }

    saveSelectedCypher(savedCypher: SavedCypher): void {
        let newIndex: number = this.props.appModel.saveSlectedCypher(savedCypher);
        this.setState({
            activeCypher: this.props.appModel.getSavedCypherList()[newIndex],
            selectedCyperIndex: newIndex
        });
    }

    deleteSlectedCypher(index: number): void {
        let newIndex: number = this.props.appModel.deleteSavedCypher(this.state.activeCypher);
        this.setState({
            activeCypher: this.props.appModel.getSavedCypherList()[newIndex],
            selectedCyperIndex: newIndex
        });
    }

    renderItem(index: number, key: string) {
      let item: SavedCypher = this._savedCypherList[index];
      let itemName: string = item.name;
      let itemCypher: string = item.cypher;
      let count: number = this._savedCypherListLength;
      let classname: string = 'item'; // 'item' + (index % 2 ? '' : ' even')
      if (index == this.state.selectedCyperIndex) {
          classname = 'item even';
      }
    //   console.log(`renderItem ${index} ${key} ${count} ${item.name} ${item.cypher}`)
      return  <div key={key} className={classname} onClick={this.onItemClicked.bind(this, index)}>
                {item.name}
              </div>;
   }

    render() {
        this._savedCypherList = this.props.appModel.getSavedCypherList();
        this._savedCypherListLength = this._savedCypherList.length;

        // console.log(`render: `, this._savedCypherList);

        return  <Draggable>
                <div className="editor-panel well" id="cypherPanel">
                    <h4 className="pull-left handle" style={{marginBottom:20}}>Cypher [{this.state.selectedCyperIndex}]</h4>
                    <div className="clearfix"></div>
                    <ReactBootstrap.Table striped bordered condensed hover style = {{width: 400}}>
                            <tbody>
                            <tr>
                            <td>name:</td>
                            <td>
                            <input name="cypherName" value={this.state.activeCypher.name} onChange={this.handleInputChange.bind(this)} style={{width: 300}} />
                            </td>
                            </tr>
                            <tr>
                            <td>cypher:</td>
                            <td>
                            <input name="cypher" value={this.state.activeCypher.cypher} onChange={this.handleInputChange.bind(this)} style={{width: 300}} />
                            </td>
                            </tr>
                            <tr>
                            <td>saved:</td>
                            <td>
                            <div style={{overflow: 'auto', maxHeight: 100}}>
                                <ReactList
                                  itemRenderer={this.renderItem.bind(this)}
                                  length={this._savedCypherListLength}
                                  type='uniform'
                                />
                            </div>
                            </td>
                            </tr>
                            <tr>
                            <td>status:</td>
                            <td>
                            <textarea name="cypherStatus" value={this.state.status} onChange={this.handleInputChange.bind(this)} style={{width: 300, height: 100}} />
                            </td>
                            </tr>
                        </tbody>
                    </ReactBootstrap.Table>
                    <ReactBootstrap.Button bsStyle={'default'} key={"run"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "run")}>Run</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'default'} key={"save"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "save")}>Save</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle={'default'} key={"delete"} style = {{width: 80}}
                        onClick={this.onButtonClicked.bind(this, "delete")}>Delete</ReactBootstrap.Button>

                </div>
                </Draggable>
    }
}
