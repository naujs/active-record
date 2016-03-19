var Model = require('@naujs/model')
  , _ = require('lodash')
  , util = require('@naujs/util')
  , Registry = require('@naujs/registry');

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
    Object.defineProperty(this, pk, {
      get: () => {
        return this._attributes[pk];
      },

      set: (value) => {
        this._attributes[pk] = value;
      }
    });

    this.setPrimaryKeyValue(attributes[pk]);
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
    return this;
  }

  isNew() {
    return !!!this.getPrimaryKeyValue();
  }

  getPersistableAttributes() {
    let properties = this.getClass().getProperties();
    let persistableAttributes = {};

    _.each(properties, (options, attr) => {
      if (options.persistable === false) {
        // skip it
      } else {
        persistableAttributes[attr] = this[attr];
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

  getMeta() {
    let meta = this.getClass().getMeta();
    meta['primaryKeyValue'] = this.getPrimaryKeyValue();
    return meta;
  }

  // TODO: figure out a better way to support self-reference
  static getMeta() {
    if (!this._meta) {
      let meta = {};

      meta.primaryKey = this.getPrimaryKey();
      meta.primaryKeyType = this.getPrimaryKeyType();
      meta.properties = _.chain(this.getProperties()).cloneDeep().toPairs().map((pair) => {
        let options = pair[1];
        options.type = options.type.toJSON();
        return pair;
      }).fromPairs().value();
      meta.modelName = this.getModelName();
      meta.pluralName = this.getPluralName();
      meta.relations = _.chain(this.getRelations()).toPairs().map((pair) => {
        let name = pair[0];
        let relation = pair[1];
        let RelatedModel = relation.modelClass;
        let relatedModelName = relation.model;

        if (!RelatedModel) {
          RelatedModel = Registry.getInstance().get('models.' + relatedModelName);
        }

        if (!RelatedModel) {
          throw `${relatedModelName} is not defined`;
        }

        let meta = RelatedModel.getMeta();
        return [name, _.extend({}, relation, meta)];
      }).fromPairs().value();

      this._meta = meta;
    }

    // TODO: this is heavy!!!
    return _.cloneDeep(this._meta);
  }

  // Data management methods
  static getConnector() {
    let connector = this.connector;
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
    return this.getConnector().read(filter, this.getMeta(), options).then((results) => {
      if (!_.isArray(results) || !_.size(results)) {
        return [];
      }

      let promises = _.map(results, (result) => {
        let instance = new this(result);
        return this.runHook('afterFind', instance, options).then(() => {
          return instance;
        });
      });

      return Promise.all(promises);
    });
  }

  static findByPk(value, options = {}) {
    let pk = this.getPrimaryKey();
    let where = {};
    where[pk] = value;
    return this.findOne({
      where: where
    }, _.extend({}, options, {
      primaryKeyValue: value
    }));
  }

  static deleteAll(filter, options = {}) {
    return this.runHook('beforeDelete', filter, options).then(() => {
      return this.getConnector().delete(filter, this.getMeta(), options).then((result) => {
        return this.runHook('afterDelete', filter, options).then(() => {
          return result;
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

      return this.runHook('beforeCreate', this, options).then(() => {
        let attributes = this.getPersistableAttributes();

        return this.getConnector().create(attributes, this.getMeta(), options).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterCreate', this, options).then(() => {
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

      return this.runHook('beforeUpdate', this, options).then((result) => {
        if (!result) {
          return false;
        }

        let attributes = this.getPersistableAttributes();
        let filter = {};
        filter.where = {};
        let primaryKey = this.getClass().getPrimaryKey();
        filter.where[primaryKey] = this.getPrimaryKeyValue();

        return this.getConnector().update(filter, attributes, this.getMeta(), options).then((result) => {
          this.setAttributes(result);

          return this.runHook('afterUpdate', this, options).then(() => {
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

    return this.runHook('beforeSave', this, options).then(() => {
      return this[method].call(this, options);
    }).then(() => {
      return this.runHook('afterSave', this, options).then(() => {
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

    return this.runHook('beforeDelete', this, options).then((result) => {
      let name = this.getClass().getModelName();
      let filter = {};
      filter.where = {};
      let primaryKey = this.getClass().getPrimaryKey();
      filter.where[primaryKey] = this.getPrimaryKeyValue();

      return this.getConnector().delete(filter, this.getMeta(), options).then((result) => {
        return this.runHook('afterDelete', this, options).then(() => {
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
