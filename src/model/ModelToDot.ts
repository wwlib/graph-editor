import {
  Model,
  Node,
  Relationship
} from 'graph-diagram';

import { DataTypes } from 'graph-diagram';

const graphlibDot = require('graphlib-dot');

export default class ModelToDot {

  public dataTypes: DataTypes = new DataTypes(); // included to force DataTypes to be included in d.ts

  static convert(model: Model): any {
    // let graph:  d3Types.d3Graph = {
    //   nodes: [],
    //   links: []
    // };
    //
    // model.nodeList().forEach((node: Node) => {
    //     let nodeData:  d3Types.d3Node = {
    //       id: node.id,
    //       group: 1,
    //       properties: node.properties.toJSON(),
    //       labels: [node.caption],
    //       position: node.position
    //     }
    //     graph.nodes.push(nodeData);
    // });
    //
    // model.relationshipList().forEach((relationship: Relationship) => {
    //   let relationshipData:  d3Types.d3Link = {
    //       source: relationship.start.id,
    //       target: relationship.end.id,
    //       value: 1,
    //       id: relationship.id,
    //       type: relationship.relationshipType,
    //       startNode: relationship.start.id,
    //       endNode: relationship.end.id,
    //       properties: relationship.properties.toJSON(),
    //       linknum: 1
    //   }
    //   graph.links.push(relationshipData);
    // });
    //
    // return graph;

    return {};
  }

  static parseDot(dot: string, modelId?: string, origin?: {x: number, y: number}) {
      let model: Model = new Model(modelId);

      let graph = graphlibDot.read(dot);

      graph.nodes().forEach((nodeName: string) =>  {
          let newNode: Node = model.createNode(nodeName);
          if (origin) {
              newNode.x = origin.x;
              newNode.y = origin.y;
          }
          newNode.caption = nodeName;
      });

      graph.edges().forEach((linkData: any) =>  {
        let fromId = linkData.v;
        let toId = linkData.w;
        let newRelationship: Relationship = model.createRelationship(model.lookupNode(fromId), model.lookupNode(toId));
        newRelationship.relationshipType = linkData.name || '';
      });

      return model;
  }
}
