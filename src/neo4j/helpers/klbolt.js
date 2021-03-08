(function () {

  var root = this;

  function isLink (field) {
    return field.start && field.end;
  }

  function isNode (field) {
    return !isLink(field);
  }

  /*
   * In future we may need neo4j driver object for the integer comparison and conversion.
   * That API is lacking though, so I write some of my own number functions in this file for now.
   * https://github.com/neo4j/neo4j-javascript-driver#a-note-on-numbers-and-the-integer-type
   * Current requirement is for neo4j object to be passed in (neo4j-driver v1.1)
   */
  function Parser (neo4j, ids) {
    ids = ids || {};
    this.neo4j = neo4j;
    this.nodeIdField = ids.nodeIdField; // || 'id';
    this.linkIdField = ids.linkIdField;
  }

  Parser.prototype.parse = function (boltResponse) {
    var i, fields, field;
    this.nodeDict = {};
    this.items = [];
    for (i = 0; i < boltResponse.records.length; i++) {
        console.log(`Parsing node ${i}`);
      this.parseFields(boltResponse.records[i]._fields);
    }
    return this.items;
  };

  /*
   * Create the node and push to the items array if it does not yet exist
   */
  Parser.prototype.makeNode = function (field) {
    var id = this.getId(field);
    console.log(`makeNode: ${id}`, field);
    var props = this.convertNumberProps(field.properties);
    if (!this.nodeDict[id]) {
      this.items.push({
        type: 'node',
        id: id,
        d: {
          props: props,
          labels: field.labels
        }
      });
      this.nodeDict[id] = true;
    }
    return id;
  };

  Parser.prototype.makeLink = function (field, id1, id2) {
    var id = this.getId(field);
    var props = this.convertNumberProps(field.properties);
    this.items.push({
      type: 'link',
      id: id,
      id1: id1,
      id2: id2,
      d: {
        props: props,
        labels: field.labels
      }
    })
  };

  Parser.prototype.convertNumberProps = function (props) {
    var key, prop;
    for (key in props) {
      prop = props[key];
      if (this.neo4j.isInt(prop)) {
        props[key] = {
          raw: prop,
          converted: this.convertInt(prop)
        };
      }
    }
    return props;
  };

  Parser.prototype.convertInt = function (neoInt) {
    return this.neo4j.integer.inSafeRange(neoInt) ? this.neo4j.integer.toNumber(neoInt) : neoInt;
  };

  Parser.prototype.getId = function (field) {
    var prop = isNode(field) ? this.nodeIdField : this.linkIdField;
    return prop ? field.properties[prop] : (isNode(field) ? 'node' : 'link') + field.identity.toString();
  };

  // Beware: IDs/identities in neo4j are unique to their type (so a node and link could have the same ID)
  Parser.prototype.parseFields = function (fields) {
      console.log(`parseFields: `, fields);
    var i, field, key;
    var neoIdDict = {};
    // first we parse the nodes
    for (i = 0; i < fields.length; i++) {
      field = fields[i];
      var id = this.getId(field);
      var neoId = (isNode(field) ? 'node' : 'link') + field.identity.toString();
      neoIdDict[neoId] = isNode(field) ? this.makeNode(field) : field;
    }
    console.log(neoIdDict);
    // now we have valid node IDs and a dictionary, we can parse the links
    for (key in neoIdDict) {
      field = neoIdDict[key];
      if (isLink(field)) {
        var start = 'node' + field.start.toString();
        var end = 'node' + field.end.toString();
        var id1 = neoIdDict[start];
        var id2 = neoIdDict[end];
        this.makeLink(field, id1, id2);
      }
    }
  };

  var klbolt = {
    Parser: Parser
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = klbolt;
  } else {
    root.klbolt = klbolt;
  }

})();
