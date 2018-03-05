import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import AppModel from '../model/AppModel';
import GraphEditor from './graphDiagram/GraphEditor';

export interface ApplicationProps { model: AppModel }
export interface ApplicationState { lastUpdateTime: number }

export default class Application extends React.Component < ApplicationProps, ApplicationState > {

    componentWillMount() {
        this.setState(({lastUpdateTime}) => ({lastUpdateTime: 0}));
        // this.props.model.on('updateModel', (model: AppModel) => {
        //     console.log(`Application: onUpdateModel`);
        //     this.setState(({lastUpdateTime}) => ({lastUpdateTime: new Date().getTime()}));
        // });
    }

    render() {
        return (
            <GraphEditor
                appModel={this.props.model}
                width={960} //{window.screen.availWidth}
                height={640} //{window.screen.availHeight}
            />
        );
    }
}
