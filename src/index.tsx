import * as React from 'react';
import * as ReactDOM from 'react-dom';

// import Application from './components/Application';
import AppModel from './model/AppModel';

import App from './App';

import 'font-awesome/css/font-awesome.min.css';
import './css/bootstrap.min.css';
// import './css/bootstrap-theme.min.css';
import './css/graph-diagram.css';
import './css/graph-editor.css';
import './css/graph-style-bootstrap.css';

let model: AppModel = new AppModel();
console.log(`index: model: `, model);

let aHead = document.head;
console.log(`aHead: `, aHead);
let style = document.createElement('style');
style.id = `graph-editor-style`;
style.appendChild(document.createTextNode(`
.active {
    stroke: #000;
    stroke-width: 4px;
}
`));
aHead.appendChild(style);

// <Application model={model} />,

 model.on('ready', () => {
    console.log(`index: model: ready`);
    ReactDOM.render(
        <App model={model} />,
        document.getElementById('root')
    );
});
