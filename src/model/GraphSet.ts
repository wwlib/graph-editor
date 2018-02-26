import fs = require('fs');
import path = require('path');
import AppModel from './AppModel';
import Graph from './Graph';
const jsonfile = require('jsonfile');
const ensureDir = require('ensureDir');
const isuuid = require('isuuid');

export default class GraphSet {

    public model: AppModel;
    public graphs: Map<string, Graph>;
    public graphIds: Map<string, string>;

    constructor(model: AppModel) {
        this.model = model;
        this.graphs = new Map<string, Graph>();
        this.graphIds = new  Map<string, string>();
        this.loadGraphIds();
    }

    addGraph(graph: Graph): Graph {
        this.graphs.set(graph.uuid, graph);
        this.graphIds.set(graph.uuid, graph.name);
        return graph;
    }

    getGraph(uuid: string): Graph {
        return this.graphs.get(uuid);
    }

    getGraphIds(): string[] {
        return Array.from( this.graphIds.values() );
    }

    loadGraphIds(): void {
        let userDataPath: string = path.resolve(this.model.userDataPath);
        fs.readdir(userDataPath, (err, files) => {
            if (err) {
                console.log(`loadGraphIds: error reading files in: ${userDataPath}`);
            } else {
                files.forEach((file: string) => {
                    let filename: string = path.basename(file, '.json');
                    if (isuuid(filename)) {
                        console.log(`loadGraphIds: adding: ${file} -> ${filename}`);
                        this.graphIds.set(filename, "na");
                        let filepath: string = path.resolve(this.model.userDataPath, file);
                        this.load(filepath, (err: any, obj: any) => {
                            if (err) {
                                console.log(`loadGraphIds: error loading: ${filepath}`);
                            } else {
                                console.log(`loadGraphIds: setting name: ${filepath}: ${obj.name}`);
                                this.graphIds.set(filename, obj.name);
                            }
                        });
                    }
                });
            }

        })
    }

    removeGraphId(uuid: string): void {
        this.graphIds.delete(uuid);
    }

    deleteGraph(graph: Graph): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let filepath: string =  path.resolve(this.model.userDataPath, `${graph.uuid}.json`);
            fs.unlink(filepath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.removeGraphId(graph.uuid);
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
                    let filepath: string =  path.resolve(this.model.userDataPath, `${graph.uuid}.json`);
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

    loadGraphWithUuid(uuid: string):  Promise<Graph> {
        return new Promise<Graph>((resolve, reject) => {
            let graph: Graph;
            let filepath: string =  path.resolve(this.model.userDataPath, `${uuid}.json`);
            this.load(filepath, (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    let graph: Graph = new Graph(uuid);
                    graph.initWithJson(data);
                    resolve(graph)
                }
            });
        });
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
