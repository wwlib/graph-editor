## graph-editor

### About
graph-editor is an electron/react app for editing live neo4j databases.

### install
`npm install`

### build
`npm run build`

### electron
npm install -g electron

### run
`electron .`

### Usage
- Note: This is a very early prototype intended for experimentation.
- Use the New File button to create a new local graph File
- Double-click nodes and relationships to edit them

![graph editor](./docs/img/GraphEditor.png)

-Use the New Neo4j button to create a connection to a live neo4j database
- set the connection url, user, password, etc.

```
"connection": {
  "type": "neo4j",
  "url": "bolt://localhost:7687",
  "user": "neo4j",
  "password": "neo4j",
  "initialCypher": "MATCH (n)-[r]-(p), (q) return n,r,p, q limit 100"
}
```

![new neo4j](./docs/img/GraphEditor_NewNeo4j.png)

- Changes in the editor are reflected in the neo4j browser

![live neo4j](./docs/img/GraphEditor_LiveNeo4j.png)
