import * as React from "react";
import "./App.css";

import AppModel from './model/AppModel';
import GraphEditor from './components/graphDiagram/GraphEditor';
export interface AppProps {
  model: AppModel
}
export interface AppState {
  lastUpdateTime: number
}
export default class App extends React.Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);
    this.state = {
      lastUpdateTime: 0,
    }
  }
    componentWillMount() {
        this.setState({lastUpdateTime: 0});
        // this.props.model.on('updateModel', (model: AppModel) => {
        //     console.log(`Application: onUpdateModel`);
        //     this.setState({lastUpdateTime});
        // });
    }

    render() {
      return (
        <div className="App">
          <GraphEditor
                appModel={this.props.model}
            />
        </div>
      );
    }
}