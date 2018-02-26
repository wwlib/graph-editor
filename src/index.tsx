import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Application from './components/Application';

import AppModel from './model/AppModel';

let model: AppModel = new AppModel();
console.log(`index: model: `, model);
model.on('ready', () => {
    console.log(`index: model: ready`);
    ReactDOM.render(
        <Application model={model} />,
        document.getElementById('reactContainer')
    );
});
