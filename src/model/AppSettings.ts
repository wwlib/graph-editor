import {EventEmitter} from "events";

// const fs = require('fs');
const path = require('path');
// const ensureDir = require('ensureDir');
const osenv = require('osenv');
const jsonfile = require('jsonfile');

let configPath = path.resolve(osenv.home(), ".wwlib-graph-editor/");
let configFile = path.resolve(configPath, "settings.json");

// let configPath = path.resolve("data");
// let configFile = path.resolve(configPath,  "data/app-settings.json");

export default class AppSettings extends EventEmitter {

    static DEFAULT_USER_DATA_PATH: string = path.resolve(configPath, "user");

    private _data: any;
    private _timestamp: number = 0;

    constructor() {
        super();
        this._data = {};
    }

    get data(): any {
        return this._data;
    }

    set data(obj: any) {
        this._data = obj;
    }

    get timestamp(): number {
        return this._timestamp;
    }

    load(cb: any){
        jsonfile.readFile(configFile, (err: any, obj: any) => {
            if (err) {
                cb(err);
            } else {
                this._data = obj;
                this._timestamp = this._data.timestamp;
                cb(err, obj);
            }
        });

    }

    save(cb: any){
        this._timestamp = new Date().getTime();
        this._data.timestamp = this._timestamp;
        jsonfile.writeFile(configFile, this._data, {spaces: 2}, (err: any) => {
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
      });
    }
}
