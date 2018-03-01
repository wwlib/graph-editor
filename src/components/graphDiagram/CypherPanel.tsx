import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";
import * as ReactList from 'react-list';
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

        this.props.appModel.on('updateCypherStatus', (model: Model) => {


            this.setState({
                status: this.props.appModel.cypherStatus
            });
            this.setState(({lastUpdateTime}) => ({lastUpdateTime: new Date().getTime()}));
        });
    }

    componentDidMount() {

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
        }
        this.setState({ activeCypher: savedCypher});
    }

    handleSubmit(event: any) {
      event.preventDefault();
    }

    onButtonClicked(action: string): void {
        console.log(`onButtonClicked: ${action}`);
        switch (action) {
            case 'run':
                this.executeCypher();
                break;
            case 'save':
                this.saveSlectedCypher(this.state.activeCypher);
                break;
            case 'delete':
                this.deleteSlectedCypher(this.state.activeCypher.index);
                    break;
        }
    }

    onItemClicked(index: number): void {
        console.log(`onButtonClicked: ${index}`);
        let item: SavedCypher = this.props.appModel.getSavedCypherList()[index];
        this.setState({
            activeCypher: item,
            selectedCyperIndex: index
        });
    }

    executeCypher(): void {

    }

    saveSlectedCypher(savedCypher: SavedCypher): void {
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
      let item: SavedCypher = this.props.appModel.getSavedCypherList()[index];
      let itemName: string = item.name;
      let itemCypher: string = item.cypher;
      let count: number = this.props.appModel.getSavedCypherList().length;
      let classname: string = 'item'; // 'item' + (index % 2 ? '' : ' even')
      if (index == this.state.selectedCyperIndex) {
          classname = 'item even';
      }
      console.log(`renderItem ${index} ${key} ${count} ${item.name} ${item.cypher}`)
      return  <div key={key} className={classname} onClick={this.onItemClicked.bind(this, index)}>
                {item.name}
              </div>;
   }

    render() {
        console.log(`render: `, this.props.appModel.getSavedCypherList());

        return  <div className="editor-panel well" id="cypherPanel">
                    <h4 className="pull-left" style={{marginBottom:20}}>Cypher [{this.state.selectedCyperIndex}]</h4>
                    <div className="clearfix"></div>
                    <ReactBootstrap.Table striped bordered condensed hover style = {{width: 400}}>
                            <tbody>
                            <tr>
                            <td>
                            <input name="cypherName" value={this.state.activeCypher.name} onChange={this.handleInputChange.bind(this)} style={{width: 300}} />
                            </td>
                            </tr>
                            <tr>
                            <td>
                            <input name="cypher" value={this.state.activeCypher.cypher} onChange={this.handleInputChange.bind(this)} style={{width: 300}} />
                            </td>
                            </tr>
                            <tr>
                            <td>
                            <div style={{overflow: 'auto', maxHeight: 100}}>
                                <ReactList
                                  itemRenderer={this.renderItem.bind(this)}
                                  length={this.props.appModel.getSavedCypherList().length}
                                  type='uniform'
                                />
                            </div>
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

                </div>;
    }
}
