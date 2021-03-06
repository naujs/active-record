var Model = require('@naujs/model')
  , _ = require('lodash')
  , util = require('@naujs/util')
  , Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , constants = require('./constants')
  , AccessControl = require('@naujs/access-control');

var Api = require('./Api')
  , ListApi = require('./api/ListApi')
  , ReadApi = require('./api/ReadApi')
  , CreateApi = require('./api/CreateApi')
  , UpdateApi = require('./api/UpdateApi')
  , DeleteApi = require('./api/DeleteApi')
  , CountApi = require('./api/CountApi')
  , FindRelationApi = require('./api/FindRelationApi');

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

// TODO: remove options from all methods if not used
class ActiveRecord extends Model {
  constructor(attributes = {}) {
    // do not pass attributes to super because we need to build other properties
    // for ActiveRecord
    super();

    // Build primaryKey
    var pk = this.getClass().getPrimaryKey();
    ActiveRecord.defineProperty(this, pk, this.getClass().getPrimaryKeyType());

    // Build foreignKeys
    _.each(this.getRelations(), (relation, name) => {
      if (relation.type === 'belongsTo') {
        ActiveRecord.defineProperty(this, relation.foreignKey, this.getClass().getForeignKeyType(name));
      }
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

  static getForeignKeyType(name) {
    var relation = this.getRelations()[name];
    if (!relation) throw `Relation ${name} not found`;
    return relation.foreignKeyType
            || Registry.getInstance().get(constants.FOREIGN_KEY_TYPE)
            || 'number';
  }

  static getPrimaryKeyType() {
    return Registry.getInstance().get(constants.PRIMARY_KEY_TYPE)
            || this.primaryKeyType
            || 'number';
  }

  getPrimaryKeyValue() {
    var pk = this.getClass().getPrimaryKey();
    return this[pk];
  }

  setPrimaryKeyValue(value) {
    var pk = this.getClass().getPrimaryKey();
    this[pk] = value;
    return this;
  }

  setAttributes(attributes = {}) {
    super.setAttributes(attributes);
    var pk = this.getClass().getPrimaryKey();
    this.setPrimaryKeyValue(attributes[pk]);
    this.setForeignAttributes(attributes);
    this.setRelationAttributes(attributes);
    return this;
  }

  setForeignAttributes(attributes = {}) {
    var foreignKeys = this.getClass().getForeignKeys();

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
      this[name] = new RelationFunction(this, name, attributes[name]).asFunction();
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
    var connector = this.connector || Registry.getInstance().get(constants.CONNECTOR);
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

      var instances = _.map(results, (result) => {
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
      var criteria = new DbCriteria(this, filter);
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
    var criteria = new DbCriteria(this, filter);
    return this.getConnector().count(criteria);
  }

  create() {
    if (!this.isNew()) {
      return Promise.reject('Can only create new models');
    }

    return this.validate().then((errors) => {
      if (errors) {
        return false;
      }

      return this.runHook('beforeCreate', {
        instance: this
      }).then((result) => {
        if (!result) {
          return false;
        }

        var attributes = this.getPersistableAttributes();
        var criteria = new DbCriteria(this, {});

        return this.getConnector().create(criteria, attributes).then((result) => {
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

    return this.validate().then((errors) => {
      if (errors) {
        return false;
      }

      return this.runHook('beforeUpdate', {
        instance: this
      }).then((result) => {
        if (!result) {
          return false;
        }

        var attributes = this.getPersistableAttributes();
        var filter = {};
        filter.where = {};
        var primaryKey = this.getClass().getPrimaryKey();
        filter.where[primaryKey] = this.getPrimaryKeyValue();

        var criteria = new DbCriteria(this, filter);

        return this.getConnector().update(criteria, attributes).then((result) => {
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
    }).then((result) => {
      if (!result) return false;
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
      var filter = {};
      filter.where = {};
      var primaryKey = this.getClass().getPrimaryKey();
      filter.where[primaryKey] = this.getPrimaryKeyValue();
      var criteria = new DbCriteria(this, filter);

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
    return _.result(this, 'relations') || {};
  }

  getRelations() {
    return this.getClass().getRelations();
  }

  // Methods to set global configuration for ActiveRecord
  static setConnector(connector) {
    Registry.getInstance().set(constants.CONNECTOR, connector);
  }

  static setPrimaryKeyType(type) {
    Registry.getInstance().set(constants.PRIMARY_KEY_TYPE, type);
  }

  static setForeignKeyType(type) {
    Registry.getInstance().set(constants.FOREIGN_KEY_TYPE, type);
  }
}

ActiveRecord.Api = Api;

ActiveRecord.mixin({}, Api.buildMixin({
  defaultApi: function() {
    var relations = this.getRelations();
    var relationApis = _.chain(relations).map((opts, name) => {
      return [
        new FindRelationApi(this, name)
      ];
    }).flatten().value();

    return [
      new CountApi(this),
      new ListApi(this),
      new ReadApi(this),
      new CreateApi(this),
      new UpdateApi(this),
      new DeleteApi(this)
    ].concat(relationApis);
  },
  apiName: function() {
    return this.getPluralName();
  }
}));

ActiveRecord.mixin({}, AccessControl.buildMixin());

module.exports = ActiveRecord;
