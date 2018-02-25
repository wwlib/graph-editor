import * as React from "react";
import * as ReactBootstrap from "react-bootstrap";

import { AppModel } from '../model/AppModel';
import GraphEditor from './graphDiagram/GraphEditor';

export interface ApplicationProps { model: AppModel }
export interface ApplicationState { lastUpdateTime: number }

export class Application extends React.Component < ApplicationProps, ApplicationState > {

    componentWillMount() {
        this.setState(({lastUpdateTime}) => ({lastUpdateTime: 0}));
        this.props.model.on('updateModel', (model: AppModel) => {
            console.log(`Application: onUpdateModel`);
            this.setState(({lastUpdateTime}) => ({lastUpdateTime: new Date().getTime()}));
        });
    }

    render() {
        return (
            // <div className="container">
            //     <div className="row">
            //         <div className="col-sm-12">
                    <GraphEditor
                        appModel={this.props.model}
                        width={960} //{window.screen.availWidth}
                        height={640} //{window.screen.availHeight}
                        graphData={this.props.model.graphData} />
            //         </div>
            //     </div>
            // </div>
        );
    }

    onButtonClicked(action: string): void {
        console.log(`onButtonClicked: ${action}`);
        // switch (action) {
        //     case 'save':
        //         this.props.model.save();
        //         break;
        //     case 'reload':
        //         this.props.model.reload();
        //         break;
        // }
    }
}
