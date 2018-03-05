import fs = require('fs');
import path = require('path');
import {EventEmitter} from "events";
const ensureDir = require('ensureDir');
const osenv = require('osenv');
const jsonfile = require('jsonfile');

// let configPath = path.resolve(osenv.home(), ".graph-editor/settings.json");
let configPath = path.resolve("data/app-settings.json");

export default class Settings extends EventEmitter {

    private _data: any;
    private _timestamp: number;

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
        jsonfile.readFile(configPath, (err: any, obj: any) => {
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
        jsonfile.writeFile(configPath, this._data, {spaces: 2}, (err: any) => {
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
      });
    }
}
