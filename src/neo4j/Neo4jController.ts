const neo4j = require('neo4j-driver').v1;
// const config = require('../../data/neo4j-db-config.json');
import { GraphConnection } from '../model/Graph';
import {
    Node,
    Relationship
} from 'graph-diagram';

import D3Helper from './helpers/D3Helper';

export default class Neo4jController {

    public driver: any;

    constructor(connection: GraphConnection) {
        this.driver = neo4j.driver(connection.url, neo4j.auth.basic(connection.user, connection.password));
    }

    call(cypher:string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let session: any = this.driver.session();
            session.run(cypher, params)
                .then(function (result: any) {
                    session.close();
                    resolve(result);
                })
                .catch(function (error: any) {
                    reject(error);
                });
        });
    }

    getCypherAsD3(cypher: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.call(cypher)
                .then(response => {
                    resolve(D3Helper.data(response, neo4j));
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    getNodesAndRelationships(limit: number = 25): Promise<any> {
        return new Promise((resolve, reject) => {
            let cypher: string = `
                MATCH (n)-[r]-(p), (q) return n,r,p, q limit ${limit}
            `;
            this.call(cypher)
                .then(response => {
                    resolve(D3Helper.data(response, neo4j));
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    getNodesWithPropertyAndValue(property: string, value: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let cypher: string = `
                MATCH (n {${property}: "${value}"})-[r]-(p)
                return n,r,p
            `;
            this.call(cypher)
                .then(response => {
                    resolve(D3Helper.data(response, neo4j));
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    updateNode(node: Node, oldLabel?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let labelToRemove: string = oldLabel || "";
            let removeLabelClause: string = "";
            if (oldLabel && (oldLabel != node.caption)) {
                removeLabelClause = `remove n :${oldLabel}`
            }
            //let id: number = Number(node.id);
            let label: string = node.caption;
            let properties: any = node.properties.toJSON();
            let cypher: string = `
                match (n) WHERE ID(n) = ${node.id}
                set n = { props }
                set n :${label}
                ${removeLabelClause}
            `;
            this.call(cypher, {props: properties})
                .then(response => {
                    resolve(D3Helper.data(response, neo4j));
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    // matching relationship by ID is not optimized #3064
    // https://github.com/neo4j/neo4j/issues/3064

    updateRelationship(relationship: Relationship): Promise<any> {
        return new Promise((resolve, reject) => {
            let label: string = relationship.relationshipType;
            let properties: any = relationship.properties.toJSON();
            let cypher: string = `
                match (start)-[r]->(end) WHERE ID(r) = ${relationship.id}
                with start, r, end
                create (start)-[r2:${label}]->(end)
                set r2 = { props }
                with r, r2
                delete r
                return r2
            `;
            this.call(cypher, {props: properties})
                .then(response => {
                    let result: any = {
                        localRelationship: relationship,
                        d3: D3Helper.data(response, neo4j)
                    }
                    if (result.d3.links && result.d3.links[0]) {
                        relationship.id = result.d3.links[0].id;
                    } else {
                        console.log(`Could not set neo4j id of new relationship!`, response, result)
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    reverseRelationship(relationship: Relationship): Promise<any> {
        return new Promise((resolve, reject) => {
            let label: string = relationship.relationshipType;
            let properties: any = relationship.properties.toJSON();
            let cypher: string = `
                match (start)-[r]->(end) WHERE ID(r) = ${relationship.id}
                with start, r, end
                create (end)-[r2:${label}]->(start)
                set r2 = { props }
                with r, r2
                delete r
                return r2
            `;
            this.call(cypher, {props: properties})
                .then(response => {
                    let result: any = {
                        localRelationship: relationship,
                        d3: D3Helper.data(response, neo4j)
                    }
                    if (result.d3.links && result.d3.links[0]) {
                        relationship.id = result.d3.links[0].id;
                    } else {
                        console.log(`Could not set neo4j id of new relationship!`, response, result)
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    addNode(node: Node): Promise<any> {
        return new Promise((resolve, reject) => {
            let cypher: string = `create (n) return n`;
            this.call(cypher)
                .then(response => {
                    let result: any = {
                        localNode: node,
                        d3: D3Helper.data(response, neo4j)
                    }
                    if (result.d3.nodes && result.d3.nodes[0]) {
                        node.id = result.d3.nodes[0].id;
                    } else {
                        console.log(`Could not set neo4j id of new node!`, response, result);
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    deleteNode(node: Node): Promise<any> {
        return new Promise((resolve, reject) => {
            let cypher: string = `match (n) where id(n) = ${node.id} detach delete n`;
            this.call(cypher)
                .then(response => {
                    let result: any = {
                        localNode: node,
                        d3: D3Helper.data(response, neo4j)
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    addRelationship(relationship: Relationship): Promise<any> {
        return new Promise((resolve, reject) => {
            let startId: string = relationship.start.id;
            let endId: string = relationship.end.id;
            let cypher: string = `MATCH (start),(end)
WHERE id(start)=${startId} AND id(end) = ${endId}
CREATE (start)-[r:RELATED_TO]->(end)
RETURN r`;
            this.call(cypher)
                .then(response => {
                    let result: any = {
                        localRelationship: relationship,
                        d3: D3Helper.data(response, neo4j)
                    }
                    if (result.d3.links && result.d3.links[0]) {
                        relationship.id = result.d3.links[0].id;
                    } else {
                        console.log(`Could not set neo4j id of new relationship!`, response, result)
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    deleteRelationship(relationship: Relationship): Promise<any> {
        return new Promise((resolve, reject) => {
            let cypher: string = `match ()-[r]-() Where ID(r)=${relationship.id} Delete r`;
            this.call(cypher)
                .then(response => {
                    let result: any = {
                        localRelationship: relationship,
                        d3: D3Helper.data(response, neo4j)
                    }
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
            });
    }

    test() {
        this.call('MATCH (n) return n LIMIT 10')
            .then(result => {
                console.log(result);
            })
            .catch(error => {
                console.log(error);
            })
    }
}
