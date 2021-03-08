/**
craco.config.js can exclude all node modules from the webpack build - for the electron version. 
This makes the build much faster and is fine for the electron version.
**/

// const  nodeExternals = require('webpack-node-externals');

let target = 'web';
let externals = [];

if (process.env.REACT_APP_MODE === 'electron') {
  target = 'electron-renderer';
  // externals = [nodeExternals()];
}
console.log(`craco.config.js: setting webpack target to: ${target}`);

module.exports = {
  webpack: {
    configure: {
      target: target,
      externals: externals,
      node: {
        __dirname: true,
        __filename: false
      }
    }
  }
};
