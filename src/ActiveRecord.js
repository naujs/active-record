var Model = require('@naujs/model')
  , _ = require('lodash')
  , util = require('@naujs/util')
  , Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria');

var Api = require('./Api')
  , ListApi = require('./api/ListApi')
  , ReadApi = require('./api/ReadApi')
  , CreateApi = require('./api/CreateApi')
  , UpdateApi = require('./api/UpdateApi')
  , DeleteApi = require('./api/DeleteApi')
  , CountApi = require('./api/CountApi');

var relationFunctions = {};
_.each([
  'belongsTo',
  'hasOne',
  'hasMany',
  'hasManyAndBelongsTo'
], (name) => {
  var capitalized = name.charAt(0).toUpperCase() + name.substr(1);
  relationFunctions[name] = require(`./relations/${capitalized}`);
});

// Helper methods
// Class-level
function defaultArgsForId(cls) {
  let args = {};
  args[cls.getPrimaryKey()] = {
    'type': cls.getPrimaryKeyType(),
    'required': true
  };
  return args;
}

function defaultPathForId(cls) {
  return '/:' + cls.getPrimaryKey();
}

// TODO: remove options from all methods if not used
class ActiveRecord extends Model {
  constructor(attributes = {}) {
    // do not pass attributes to super because we need to build other properties
    // for ActiveRecord
    super();

    // Build primaryKey
    let pk = this.getClass().getPrimaryKey();
    ActiveRecord.defineProperty(this, pk, 'any');

    // Build foreignKeys
    let foreignKeys = this.getClass().getForeignKeys();
    _.each(foreignKeys, (key) => {
      ActiveRecord.defineProperty(this, key, 'any');
    });

    // relations are stored differently than normal attributes
    this._relations = {};
    var instance = this;
    var relations = this.getClass().getRelations();
    _.each(relations, (relation, name) => {
      Object.defineProperty(this, name, {
        get: function() {
          return instance._relations[name];
        },

        set: function(value) {
          instance._relations[name] = value;
        }
      });
    });

    this.setAttributes(attributes);
  }

  static getPrimaryKey() {
    return this.primaryKey || 'id';
  }

  static getPrimaryKeyType() {
    return this.primaryKeyType || 'number';
  }

  getPrimaryKeyValue() {
    let pk = this.getClass().getPrimaryKey();
    return this[pk];
  }

  setPrimaryKeyValue(value) {
    let pk = this.getClass().getPrimaryKey();
    this[pk] = value;
    return this;
  }

  setAttributes(attributes = {}) {
    super.setAttributes(attributes);
    let pk = this.getClass().getPrimaryKey();
    this.setPrimaryKeyValue(attributes[pk]);
    this.setForeignAttributes(attributes);
    this.setRelationAttributes(attributes);
    return this;
  }

  setForeignAttributes(attributes = {}) {
    let foreignKeys = this.getClass().getForeignKeys();

    _.each(foreignKeys, (key) => {
      if (attributes[key] !== void(0)) {
        this[key] = attributes[key];
      }
    });

    return this;
  }

  setRelationAttributes(attributes = {}) {
    var relations = this.getClass().getRelations();
    _.each(relations, (relation, name) => {
      var RelationFunction = relationFunctions[relation.type];
      this[name] = new RelationFunction(this, relation, attributes[name]).asFunction();
    });
    return this;
  }

  isNew() {
    return !!!this.getPrimaryKeyValue();
  }

  static getForeignKeys() {
    return _.chain(this.getRelations()).map((relation) => {
      // TODO: use constants here
      if (relation.type == 'belongsTo') {
        return relation.foreignKey;
      }
      return null;
    }).compact().value();
  }

  static getAllProperties() {
    if (!this._allProperties) {
      var properties = _.chain(this.getProperties()).clone().toPairs().filter((pair) => {
        return pair[1].persistable !== false;
      }).fromPairs().keys().value();
      properties.push(this.getPrimaryKey());
      this._allProperties = _.union(properties, this.getForeignKeys());
    }
    return this._allProperties;
  }

  getPersistableAttributes() {
    var properties = this.getClass().getProperties();
    var persitableProperties = this.getClass().getAllProperties();
    var persistableAttributes = {};

    _.each(persitableProperties, (name) => {
      if (this[name] != void(0)) {
        persistableAttributes[name] = this[name];
      }
    });

    return persistableAttributes;
  }

  toJSON() {
    var json = super.toJSON();
    var pk = this.getPrimaryKeyValue();
    if (pk) {
      json[this.getClass().getPrimaryKey()] = pk;
    }

    var relations = this.getClass().getRelations();
    _.each(relations, (opts, name) => {
      var relationValue = this[name].getValue();
      if (relationValue) {
        // TODO: fix this, it is very insufficient to do this
        json[name] = JSON.parse(JSON.stringify(relationValue));
      }
    });

    return json;
  }

  // Data management methods
  static getConnector() {
    let connector = this.connector || Registry.getInstance().get('ActiveRecord.connector');
    if (!connector) {
      throw 'Must have connector';
    }
    return connector;
  }

  getConnector() {
    return this.getClass().getConnector();
  }

  static findOne(filter = {}) {
    filter.limit = 1;
    return this.findAll(filter).then((results) => {
      if (!results.length) {
        return null;
      }

      return results[0];
    });
  }

  static findAll(filter) {
    return this.getConnector().read(new DbCriteria(this, filter)).then((results) => {
      if (!_.isArray(results) || !_.size(results)) {
        return [];
      }

      let instances = _.map(results, (result) => {
        return new this(result);
      });

      return this.runHook('afterFind', {
        instances: instances,
        filter: filter
      }).then(() => {
        return instances;
      });
    });
  }

  static findByPk(value, filter = {}) {
    var pk = this.getPrimaryKey();
    filter.where = {};
    filter.where[pk] = value;

    return this.findOne(filter);
  }

  static deleteAll(filter) {
    return this.runHook('beforeDelete', {
      filter: filter
    }).then(() => {
      let criteria = new DbCriteria(this, filter);
      return this.getConnector().delete(criteria).then((results) => {
        return this.runHook('afterDelete', {
          filter: filter,
          deleted: results
        }).then(() => {
          return results;
        });
      });
    });
  }

  static deleteOne(filter = {}) {
    filter.limit = 1;
    return this.deleteAll(filter).then((results) => {
      return results[0] || null;
    });
  }

  static deleteByPk(pk) {
    var filter = {};
    filter.where = {};
    var primaryKey = this.getPrimaryKey();
    filter.where[primaryKey] = pk;

    return deleteOne(filter);
  }

  static count(filter) {
    let criteria = new DbCriteria(this, filter);
    return this.getConnector().count(criteria);
  }

  create() {
    if (!this.isNew()) {
      return Promise.reject('Can only create new models');
    }

    return this.validate().then((result) => {
      if (!result) {
        return false;
      }

      return this.runHook('beforeCreate', {
        instance: this
      }).then(() => {
        let attributes = this.getPersistableAttributes();
        let criteria = new DbCriteria(this, {});

        criteria.setAttributes(attributes);
        return this.getConnector().create(criteria).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterCreate', {
            instance: this
          }).then(() => {
            return this;
          });
        });
      });
    });
  }

  update() {
    if (this.isNew()) {
      return Promise.reject('Cannot update new model');
    }

    return this.validate().then((result) => {
      if (!result) {
        return false;
      }

      return this.runHook('beforeUpdate', {
        instance: this
      }).then((result) => {
        if (!result) {
          return false;
        }

        let attributes = this.getPersistableAttributes();
        let filter = {};
        filter.where = {};
        let primaryKey = this.getClass().getPrimaryKey();
        filter.where[primaryKey] = this.getPrimaryKeyValue();

        let criteria = new DbCriteria(this, filter);
        criteria.setAttributes(attributes);

        return this.getConnector().update(criteria).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterUpdate', {
            instance: this
          }).then(() => {
            return this;
          });
        });
      });
    });
  }

  save() {
    var method = 'update';
    if (this.isNew()) {
      method = 'create';
    }

    return this.runHook('beforeSave', {
      instance: this
    }).then(() => {
      return this[method].call(this);
    }).then((result) => {
      if (result === false) return false;

      return this.runHook('afterSave', {
        instance: this
      }).then(() => {
        return this;
      }, () => {
        return this;
      });
    });
  }

  delete() {
    if (this.isNew()) {
      return Promise.reject('Cannot delete new model');
    }

    return this.runHook('beforeDelete', {
      instance: this
    }).then((result) => {
      let filter = {};
      filter.where = {};
      let primaryKey = this.getClass().getPrimaryKey();
      filter.where[primaryKey] = this.getPrimaryKeyValue();
      let criteria = new DbCriteria(this, filter);

      return this.getConnector().delete(criteria).then((result) => {
        return this.runHook('afterDelete', {
          instance: this
        }).then(() => {
          return this;
        });
      });
    });
  }

  // Relations
  static getRelations() {
    return _.clone(this.relations) || {};
  }

  getRelations() {
    return this.getClass().getRelations();
  }
}

ActiveRecord.Api = Api;

ActiveRecord.mixin({}, Api.buildMixin({
  defaultApi: function() {
    return [
      new ListApi(this),
      new ReadApi(this),
      new CreateApi(this),
      new UpdateApi(this),
      new DeleteApi(this),
      new CountApi(this)
    ];
  },
  apiName: function() {
    return this.getPluralName();
  }
}));

module.exports = ActiveRecord;
