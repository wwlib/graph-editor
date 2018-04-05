import BoltToD3 from './BoltToD3';

// const klbolt = require('./klbolt.js');

export default class PartnersGraphHelper {

    static data(cypherResponse: any, neo4j: any): any[] {
        let result: any = {};
        let parser = new BoltToD3(neo4j);
        result = parser.parse(cypherResponse)
        return result;
    }
}
