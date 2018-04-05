import * as React from "react";
// import * as ReactBootstrap from "react-bootstrap";

import AppModel from '../model/AppModel';
import GraphEditor from './graphDiagram/GraphEditor';

export interface ApplicationProps { model: AppModel }
export interface ApplicationState { lastUpdateTime: number }

export default class Application extends React.Component < ApplicationProps, ApplicationState > {

    componentWillMount() {
        this.setState({lastUpdateTime: 0});
        // this.props.model.on('updateModel', (model: AppModel) => {
        //     console.log(`Application: onUpdateModel`);
        //     this.setState({lastUpdateTime});
        // });
    }

    render() {
        return (
            <GraphEditor
                appModel={this.props.model}
            />
        );
    }
}
