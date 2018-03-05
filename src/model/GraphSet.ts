import fs = require('fs');
import path = require('path');
import AppModel from './AppModel';
import Graph, { GraphConnection } from './Graph';
const jsonfile = require('jsonfile');
const ensureDir = require('ensureDir');

export default class GraphSet {

    public model: AppModel;
    public graphNames: Map<string, GraphConnection>;

    constructor(model: AppModel) {
        this.model = model;
        this.graphNames = new  Map<string, GraphConnection>();
    }

    addGraph(graph: Graph): Graph {
        this.graphNames.set(graph.name, graph.connection);
        return graph;
    }

    getGraphConnectionWithName(name: string): GraphConnection {
        return this.graphNames.get(name);
    }

    getGraphNames(): string[] {
        return Array.from( this.graphNames.keys() );
    }

    loadGraphNames(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let userDataPath: string = path.resolve(this.model.userDataPath);
            ensureDir(path.resolve(this.model.userDataPath), 0o755, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    fs.readdir(userDataPath, (err, files) => {
                        if (err) {
                            console.log(`loadGraphNames: error reading files in: ${userDataPath}`);
                            reject(err);
                        } else {
                            files.forEach((file: string) => {
                                let filename: string = path.basename(file, '.json');
                                    console.log(`loadGraphNames: adding: ${file} -> ${filename}`);
                                    this.graphNames.set(filename, null);
                                    // let filepath: string = path.resolve(this.model.userDataPath, file);
                                    // this.load(filepath, (err: any, obj: any) => {
                                    //     if (err) {
                                    //         console.log(`loadGraphNames: error loading: ${filepath}`);
                                    //     } else {
                                    //         console.log(`loadGraphNames: setting connection: ${filename}: ${obj.connection}`);
                                    //         this.graphNames.set(filename, obj.connection);
                                    //     }
                                    // });
                            });
                            resolve()
                        }
                    });
                }
            });
        })
    }

    removeGraphName(name: string): void {
        this.graphNames.delete(name);
    }

    deleteGraph(graph: Graph): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let filepath: string =  this.generateFilepathWithName(graph.name);
            fs.unlink(filepath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.removeGraphName(graph.name);
                    resolve();
                }
            });
        });
    }

    saveGraph(graph: Graph):  Promise<Graph> {
        return new Promise<Graph>((resolve, reject) => {
            let json: any = graph.toJSON();
            ensureDir(path.resolve(this.model.userDataPath), 0o755, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    let filepath: string =  this.generateFilepathWithName(graph.name);
                    this.save(filepath, json, (err: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(graph);
                        }
                    });
                }
            });
        });
    }

    loadGraphWithName(name: string):  Promise<Graph> {
        return new Promise<Graph>((resolve, reject) => {
            let filepath: string =  this.generateFilepathWithName(name);
            this.load(filepath, (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    let graph: Graph = new Graph();
                    graph.initWithJson(data);
                    resolve(graph)
                }
            });
        });
    }

    generateFilepathWithName(name: string): string {
        return path.resolve(this.model.userDataPath, `${name}.json`);
    }

    load(filepath: string, cb: any){
        jsonfile.readFile(filepath, (err: any, obj: any) => {
            if (err) {
                cb(err);
            } else {
                cb(err, obj);
            }
        });
    }

    save(filepath: string, data: any, cb: any){
        let timestamp = new Date().getTime();
        data.timestamp = timestamp;
        jsonfile.writeFile(filepath, data, {spaces: 2}, (err: any) => {
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
      });
    }
}
