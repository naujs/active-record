var Model = require('@naujs/model')
  , _ = require('lodash')
  , util = require('@naujs/util')
  , Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria');

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

// Instance-level

function executeOrReturnUndefined(context, method) {
  if (_.isFunction(context[method])) {
    return context[method]();
  }
}

function buildConnectorOptions(instance, options) {
  options = _.cloneDeep(options);

  let Class = _.isFunction(instance.getClass) ? instance.getClass() : instance;

  options.primaryKey = Class.getPrimaryKey();
  options.primaryKeyType = Class.getPrimaryKeyType();
  options.primaryKeyValue = executeOrReturnUndefined(instance, 'getPrimaryKeyValue') || options.primaryKeyValue;
  options.properties = _.chain(Class.getProperties()).cloneDeep().toPairs().map((pair) => {
    let options = pair[1];
    options.type = options.type.toJSON();
    return pair;
  }).fromPairs().value();
  options.modelName = Class.getModelName();
  options.pluralName = Class.getPluralName();
  options.relations = Class.getRelations();

  return options;
}

class ActiveRecord extends Model {
  constructor(attributes = {}) {
    super(attributes);

    let pk = this.getClass().getPrimaryKey();
    ActiveRecord.defineProperty(this, pk);
    this.setPrimaryKeyValue(attributes[pk]);

    let foreignKeys = this.getClass().getForeignKeys();
    _.each(foreignKeys, (key) => {
      ActiveRecord.defineProperty(this, key);
    });
    this.setForeignAttributes(attributes);
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
    let properties = this.getClass().getProperties();
    let persitableProperties = this.getClass().getAllProperties();
    let persistableAttributes = {};

    _.each(persitableProperties, (name) => {
      if (this[name] != void(0)) {
        persistableAttributes[name] = this[name];
      }
    });

    return persistableAttributes;
  }

  toJSON() {
    let json = super.toJSON();
    let pk = this.getPrimaryKeyValue();
    if (pk) {
      json[this.getClass().getPrimaryKey()] = pk;
    }
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

  static findOne(filter = {}, options = {}) {
    filter.limit = 1;
    return this.findAll(filter, options).then((results) => {
      if (!results.length) {
        return null;
      }

      return results[0];
    });
  }

  static findAll(filter, options = {}) {
    return this.getConnector().read(new DbCriteria(this, filter, options), options).then((results) => {
      if (!_.isArray(results) || !_.size(results)) {
        return [];
      }

      let instances = _.map(results, (result) => {
        return new this(result);
      });

      return this.runHook('afterFind', {
        instances: instances,
        filter: filter
      }, options).then(() => {
        return instances;
      });
    });
  }

  static findByPk(value, options = {}) {
    let pk = this.getPrimaryKey();
    let where = {};
    where[pk] = value;
    return this.findOne({
      where: where
    }, options);
  }

  static deleteAll(filter, options = {}) {
    return this.runHook('beforeDelete', {
      filter: filter
    }, options).then(() => {
      let criteria = new DbCriteria(this, filter, options);
      return this.getConnector().delete(criteria, options).then((results) => {
        return this.runHook('afterDelete', {
          filter: filter,
          deleted: results
        }, options).then(() => {
          return results;
        });
      });
    });
  }

  create(options = {}) {
    if (!this.isNew()) {
      return Promise.reject('Can only create new models');
    }

    return this.validate(options).then((result) => {
      if (!result) {
        return false;
      }

      return this.runHook('beforeCreate', {
        instance: this
      }, options).then(() => {
        let attributes = this.getPersistableAttributes();
        let criteria = new DbCriteria(this, {}, options);

        criteria.setAttributes(attributes);
        return this.getConnector().create(criteria, options).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterCreate', {
            instance: this
          }, options).then(() => {
            return this;
          });
        });
      });
    });
  }

  update(options = {}) {
    if (this.isNew()) {
      return Promise.reject('Cannot update new model');
    }

    return this.validate(options).then((result) => {
      if (!result) {
        return false;
      }

      return this.runHook('beforeUpdate', {
        instance: this
      }, options).then((result) => {
        if (!result) {
          return false;
        }

        let attributes = this.getPersistableAttributes();
        let filter = {};
        filter.where = {};
        let primaryKey = this.getClass().getPrimaryKey();
        filter.where[primaryKey] = this.getPrimaryKeyValue();

        let criteria = new DbCriteria(this, filter, options);
        criteria.setAttributes(attributes);

        return this.getConnector().update(criteria, options).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterUpdate', {
            instance: this
          }, options).then(() => {
            return this;
          });
        });
      });
    });
  }

  save(options = {}) {
    var method = 'update';
    if (this.isNew()) {
      method = 'create';
    }

    return this.runHook('beforeSave', {
      instance: this
    }, options).then(() => {
      return this[method].call(this, options);
    }).then(() => {
      return this.runHook('afterSave', {
        instance: this
      }, options).then(() => {
        return this;
      }, () => {
        return this;
      });
    });
  }

  delete(options = {}) {
    if (this.isNew()) {
      return Promise.reject('Cannot delete new model');
    }

    return this.runHook('beforeDelete', {
      instance: this
    }, options).then((result) => {
      let filter = {};
      filter.where = {};
      let primaryKey = this.getClass().getPrimaryKey();
      filter.where[primaryKey] = this.getPrimaryKeyValue();
      let criteria = new DbCriteria(this, filter, options);

      return this.getConnector().delete(criteria, options).then((result) => {
        return this.runHook('afterDelete', {
          instance: this
        }, options).then(() => {
          return this;
        });
      });
    });
  }

  // Relations
  static getRelations() {
    return _.cloneDeep(this.relations) || {};
  }

  getRelations() {
    return this.getClass().getRelations();
  }

  // API stuff

  static getApiName() {
    return this.getPluralName();
  }

  /**
   * Gets the user-defined end points and merge them with the default ones
   * By default there are 5 endpoints for
   * - find all records (findAll)
   * - find one record (find)
   * - create new record (create)
   * - update existing record (update)
   * - delete a record (delete)
   * @return {Object}
   */
  static getEndPoints() {
    let userDefinedEndPoints = this.endPoints || {};
    return _.extend({}, this.getDefaultEndPoints(), userDefinedEndPoints);
  }

  /**
   * A list of default end points
   * @return {Object}
   */
  static getDefaultEndPoints() {
    return this.defaultEndPoints || {
      'list': {
        'path': '/',
        'type': 'GET',
        'args': {
          'where': 'object',
          'include': 'any',
          'field': ['string'],
          'order': ['string'],
          'limit': 'number',
          'offset': 'number'
        }
      },

      'find': {
        'path': defaultPathForId(this),
        'type': 'GET',
        'args': defaultArgsForId(this)
      },

      'create': {
        'path': '/',
        'type': 'POST'
      },

      'update': {
        'path': defaultPathForId(this),
        'type': 'PUT',
        'args': defaultArgsForId(this)
      },

      'delete': {
        'path': defaultPathForId(this),
        'type': 'DELETE',
        'args': defaultArgsForId(this)
      }
    };
  }

  static _runHooks(hooks, ignoreError, args, result) {
    if (!hooks || !hooks.length) {
      return Promise.resolve(true);
    }

    let hook = hooks.shift();

    return util.tryPromise(hook.call(this, args, result)).catch((e) => {
      if (ignoreError) {
        return false;
      }
      return Promise.reject(e);
    }).then(() => {
      return this._runHooks(hooks, ignoreError, args, result);
    });
  }

  static executeApi(methodName, args, context) {
    let method = this[methodName];

    if (!method) {
      let error = new Error(`${methodName} is not found`);
      error.httpCode = error.code = 500;
      return Promise.reject(error);
    }

    let promises = [];

    // Processes before hooks, skips the process when there is a rejection
    let beforeHooks = (this._beforeHooks || {})[methodName];
    return this._runHooks(beforeHooks, false, args).then(() => {
      return util.tryPromise(method.call(this, args, context));
    }).then((result) => {
      // Processes after hooks and ignores rejection
      let afterHooks = (this._afterHooks || {})[methodName];
      return this._runHooks(afterHooks, true, args, result).then(() => {
        return result;
      });
    });
  }

  /**
   * This method is called before the execution of an api handler
   * @param  {String}   methodName method name
   * @param  {Function} fn         the funciton to be executed
   * @return {Promise}
   */
  static beforeApi(methodName, fn) {
    this._beforeHooks = this._beforeHooks || {};
    if (!this._beforeHooks[methodName]) {
      this._beforeHooks[methodName] = [];
    }

    this._beforeHooks[methodName].push(fn);
  }

  static clearBeforeApiHooks() {
    this._beforeHooks = {};
  }

  /**
   * This method is called after the execution of an api handler
   * @param  {String}   methodName method name
   * @param  {Function} fn         the funciton to be executed
   * @return {Promise}
   */
  static afterApi(methodName, fn) {
    this._afterHooks = this._afterHooks || {};
    if (!this._afterHooks[methodName]) {
      this._afterHooks[methodName] = [];
    }

    this._afterHooks[methodName].push(fn);
  }

  static clearAfterApiHooks() {
    this._afterHooks = {};
  }

  // Default API handlers
  static list(args, context) {
    return this.findAll(args);
  }

  static find(args, context) {
    return this.findByPk(args[this.getPrimaryKey()]);
  }

  static create(args, context) {
    var instance = new this(args);
    return instance.save();
  }

  static update(args, context) {
    var instance = new this(args);
    return instance.save();
  }

  static delete(args, context) {
    var instance = new this(args);
    return instance.delete();
  }
}

module.exports = ActiveRecord;
