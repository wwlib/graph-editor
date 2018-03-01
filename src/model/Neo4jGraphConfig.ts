export type SavedCypher = {
    index?: number;
    name: string;
    cypher: string;
}

export default class Neo4jGraphConfig {

    public initialCypher: string;
    public savedCyphers: Map<number, SavedCypher>;
    public nextCypherIndex: number = 0;

    constructor(json: any) {
        this.initWithJson(json);
    }

    initWithJson(json: any) {
        this.initialCypher = json.initialCypher;
        this.savedCyphers = new Map<number, SavedCypher>();
        this.nextCypherIndex = 0;
        json.savedCyphers.forEach((savedCypher: SavedCypher) => {
            this.addSavedCypher(savedCypher.name, savedCypher.cypher);
        });
    }

    savedCyphersToArray(): any[] {
        return Array.from( this.savedCyphers.values() );
    }

    toJSON(): any {
        let json: any = {};
        json.initialCypher = this.initialCypher;
        json.savedCyphers = this.savedCyphersToArray();
        return json;
    }

    addSavedCypher(name: string, cypher: string): number {
        let savedCypherIndex: number = this.nextCypherIndex++;
        this.savedCyphers.set(savedCypherIndex, {index: savedCypherIndex, name: name, cypher: cypher});
        return this.savedCyphers.size;
    }

    deleteSavedCypherWithIndex(index: number): number {
        this.savedCyphers.delete(index);
        return 0
    }
}
