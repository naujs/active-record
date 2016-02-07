var Model = require('@naujs/model')
  , _ = require('lodash')
  , util = require('@naujs/util');

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
  options.primaryKeyValue = executeOrReturnUndefined(instance, 'getPrimaryKeyValue');
  options.properties = _.chain(Class.getProperties()).cloneDeep().toPairs().map((pair) => {
    let options = pair[1];
    options.type = options.type.toJSON();
    return pair;
  }).fromPairs().value();
  options.modelName = Class.getModelName();
  options.pluralName = Class.getPluralName();

  return options;
}

function onAfterFind(instance, options) {
  let onAfterFind = instance.onAfterFind(options);

  return util.tryPromise(onAfterFind).then(() => {
    return instance;
  });
}

function onBeforeCreate(instance, options) {
  let onBeforeCreate = instance.onBeforeCreate(options);

  return util.tryPromise(onBeforeCreate).then((result) => {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterCreate(instance, options) {
  let onAfterCreate = instance.onAfterCreate(options);

  return util.tryPromise(onAfterCreate).then(() => {
    return instance;
  });
}

function onBeforeUpdate(instance, options) {
  let onBeforeUpdate = instance.onBeforeUpdate(options);

  return util.tryPromise(onBeforeUpdate).then((result) => {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterUpdate(instance, options) {
  let onAfterUpdate = instance.onAfterUpdate(options);

  return util.tryPromise(onAfterUpdate).then(() => {
    return instance;
  });
}

function onBeforeDelete(instance, options) {
  let onBeforeDelete = instance.onBeforeDelete(options);

  return util.tryPromise(onBeforeDelete).then((result) => {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterDelete(instance, options) {
  let onAfterDelete = instance.onAfterDelete(options);

  return util.tryPromise(onAfterDelete).then(() => {
    return instance;
  });
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

  // Lifecycle hooks

  onAfterFind(options = {}) {
    return this;
  }

  onBeforeCreate(options = {}) {
    return true;
  }

  onAfterCreate(options = {}) {
    return this;
  }

  onBeforeUpdate(options = {}) {
    return true;
  }

  onAfterUpdate(options = {}) {
    return this;
  }

  onBeforeSave(options = {}) {
    return true;
  }

  onAfterSave(options = {}) {
    return this;
  }

  onBeforeDelete(options = {}) {
    return true;
  }

  onAfterDelete(options = {}) {
    return this;
  }

  // Data management methods
  static getConnector() {
    let connector = this.connector;
    if (!connector) {
      throw 'Must have connector';
    }
    return connector;
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
    return this.getConnector().read(filter, buildConnectorOptions(this, options)).then((results) => {
      if (!_.isArray(results) || !_.size(results)) {
        return [];
      }

      let promises = _.map(results, (result) => {
        let instance = new this(result);
        return onAfterFind(instance, options).then(() => {
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
    }, options);
  }

  static deleteAll(filter, options = {}) {
    return this.getConnector().delete(filter, buildConnectorOptions(this, options));
  }

  create(options = {}) {
    if (!this.isNew()) {
      return Promise.reject('Can only create new models');
    }

    return this.validate(options).then((result) => {
      if (!result) {
        return false;
      }

      return onBeforeCreate(this, options).then((result) => {
        if (!result) {
          return false;
        }

        let attributes = this.getPersistableAttributes();

        return this.getClass().getConnector().create(attributes, buildConnectorOptions(this, options)).then((result) => {
          this.setAttributes(result);
          return onAfterCreate(this, options);
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

      return onBeforeUpdate(this, options).then((result) => {
        if (!result) {
          return false;
        }

        let attributes = this.getPersistableAttributes();
        let filter = {};
        filter.where = {};
        let primaryKey = this.getClass().getPrimaryKey();
        filter.where[primaryKey] = this.getPrimaryKeyValue();

        return this.getClass().getConnector().update(filter, attributes, buildConnectorOptions(this, options)).then((result) => {
          this.setAttributes(result);
          return onAfterUpdate(this, options);
        });
      });
    });
  }

  save(options = {}) {
    if (this.isNew()) {
      return this.create(options);
    }
    return this.update(options);
  }

  delete(options = {}) {
    if (this.isNew()) {
      return Promise.reject('Cannot delete new model');
    }

    return onBeforeDelete(this, options).then((result) => {
      if (!result) {
        return false;
      }

      let name = this.getClass().getModelName();
      let filter = {};
      filter.where = {};
      let primaryKey = this.getClass().getPrimaryKey();
      filter.where[primaryKey] = this.getPrimaryKeyValue();

      return this.getClass().getConnector().delete(filter, buildConnectorOptions(this, options)).then((result) => {
        return onAfterDelete(this, options);
      });
    });
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
      'findAll': {
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

      'findByPk': {
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
}

module.exports = ActiveRecord;
