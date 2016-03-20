'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Model = require('@naujs/model'),
    _ = require('lodash'),
    util = require('@naujs/util'),
    Registry = require('@naujs/registry');

// Helper methods
// Class-level
function defaultArgsForId(cls) {
  var args = {};
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

  var Class = _.isFunction(instance.getClass) ? instance.getClass() : instance;

  options.primaryKey = Class.getPrimaryKey();
  options.primaryKeyType = Class.getPrimaryKeyType();
  options.primaryKeyValue = executeOrReturnUndefined(instance, 'getPrimaryKeyValue') || options.primaryKeyValue;
  options.properties = _.chain(Class.getProperties()).cloneDeep().toPairs().map(function (pair) {
    var options = pair[1];
    options.type = options.type.toJSON();
    return pair;
  }).fromPairs().value();
  options.modelName = Class.getModelName();
  options.pluralName = Class.getPluralName();
  options.relations = Class.getRelations();

  return options;
}

var ActiveRecord = (function (_Model) {
  _inherits(ActiveRecord, _Model);

  function ActiveRecord() {
    var attributes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, ActiveRecord);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ActiveRecord).call(this, attributes));

    var pk = _this.getClass().getPrimaryKey();
    Object.defineProperty(_this, pk, {
      get: function get() {
        return _this._attributes[pk];
      },

      set: function set(value) {
        _this._attributes[pk] = value;
      }
    });

    _this.setPrimaryKeyValue(attributes[pk]);
    return _this;
  }

  _createClass(ActiveRecord, [{
    key: 'getPrimaryKeyValue',
    value: function getPrimaryKeyValue() {
      var pk = this.getClass().getPrimaryKey();
      return this[pk];
    }
  }, {
    key: 'setPrimaryKeyValue',
    value: function setPrimaryKeyValue(value) {
      var pk = this.getClass().getPrimaryKey();
      this[pk] = value;
      return this;
    }
  }, {
    key: 'setAttributes',
    value: function setAttributes() {
      var attributes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      _get(Object.getPrototypeOf(ActiveRecord.prototype), 'setAttributes', this).call(this, attributes);
      var pk = this.getClass().getPrimaryKey();
      this.setPrimaryKeyValue(attributes[pk]);
      return this;
    }
  }, {
    key: 'isNew',
    value: function isNew() {
      return !!!this.getPrimaryKeyValue();
    }
  }, {
    key: 'getPersistableAttributes',
    value: function getPersistableAttributes() {
      var _this2 = this;

      var properties = this.getClass().getProperties();
      var persistableAttributes = {};

      _.each(properties, function (options, attr) {
        if (options.persistable === false) {
          // skip it
        } else {
            persistableAttributes[attr] = _this2[attr];
          }
      });

      return persistableAttributes;
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      var json = _get(Object.getPrototypeOf(ActiveRecord.prototype), 'toJSON', this).call(this);
      var pk = this.getPrimaryKeyValue();
      if (pk) {
        json[this.getClass().getPrimaryKey()] = pk;
      }
      return json;
    }
  }, {
    key: 'getMeta',
    value: function getMeta() {
      var meta = this.getClass().getMeta();
      meta['primaryKeyValue'] = this.getPrimaryKeyValue();
      return meta;
    }

    // TODO: figure out a better way to support self-reference

  }, {
    key: 'getConnector',
    value: function getConnector() {
      return this.getClass().getConnector();
    }
  }, {
    key: 'create',
    value: function create() {
      var _this3 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (!this.isNew()) {
        return Promise.reject('Can only create new models');
      }

      return this.validate(options).then(function (result) {
        if (!result) {
          return false;
        }

        return _this3.runHook('beforeCreate', _this3, options).then(function () {
          var attributes = _this3.getPersistableAttributes();

          return _this3.getConnector().create(attributes, _this3.getMeta(), options).then(function (result) {
            _this3.setAttributes(result);

            return _this3.runHook('afterCreate', _this3, options).then(function () {
              return _this3;
            });
          });
        });
      });
    }
  }, {
    key: 'update',
    value: function update() {
      var _this4 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return Promise.reject('Cannot update new model');
      }

      return this.validate(options).then(function (result) {
        if (!result) {
          return false;
        }

        return _this4.runHook('beforeUpdate', _this4, options).then(function (result) {
          if (!result) {
            return false;
          }

          var attributes = _this4.getPersistableAttributes();
          var filter = {};
          filter.where = {};
          var primaryKey = _this4.getClass().getPrimaryKey();
          filter.where[primaryKey] = _this4.getPrimaryKeyValue();

          return _this4.getConnector().update(filter, attributes, _this4.getMeta(), options).then(function (result) {
            _this4.setAttributes(result);

            return _this4.runHook('afterUpdate', _this4, options).then(function () {
              return _this4;
            });
          });
        });
      });
    }
  }, {
    key: 'save',
    value: function save() {
      var _this5 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var method = 'update';
      if (this.isNew()) {
        method = 'create';
      }

      return this.runHook('beforeSave', this, options).then(function () {
        return _this5[method].call(_this5, options);
      }).then(function () {
        return _this5.runHook('afterSave', _this5, options).then(function () {
          return _this5;
        }, function () {
          return _this5;
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete() {
      var _this6 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return Promise.reject('Cannot delete new model');
      }

      return this.runHook('beforeDelete', this, options).then(function (result) {
        var name = _this6.getClass().getModelName();
        var filter = {};
        filter.where = {};
        var primaryKey = _this6.getClass().getPrimaryKey();
        filter.where[primaryKey] = _this6.getPrimaryKeyValue();

        return _this6.getConnector().delete(filter, _this6.getMeta(), options).then(function (result) {
          return _this6.runHook('afterDelete', _this6, options).then(function () {
            return _this6;
          });
        });
      });
    }

    // Relations

  }, {
    key: 'getRelations',
    value: function getRelations() {
      return this.getClass().getRelations();
    }

    // API stuff

  }], [{
    key: 'getPrimaryKey',
    value: function getPrimaryKey() {
      return this.primaryKey || 'id';
    }
  }, {
    key: 'getPrimaryKeyType',
    value: function getPrimaryKeyType() {
      return this.primaryKeyType || 'number';
    }
  }, {
    key: 'getAllProperties',
    value: function getAllProperties() {
      var properties = _.chain(this.getProperties()).clone().keys().value();
      properties.push(this.getPrimaryKey());
      var foreignKeys = _.chain(this.getRelations()).map(function (relation) {
        // TODO: use constants here
        if (relation.type == 'belongsTo') {
          return relation.foreignKey;
        }
        return null;
      }).compact().value();
      return _.union(properties, foreignKeys);
    }
  }, {
    key: 'getMeta',
    value: function getMeta() {
      if (!this._meta) {
        var meta = {};

        meta.primaryKey = this.getPrimaryKey();
        meta.primaryKeyType = this.getPrimaryKeyType();
        meta.properties = _.chain(this.getProperties()).cloneDeep().toPairs().map(function (pair) {
          var options = pair[1];
          options.type = options.type.toJSON();
          return pair;
        }).fromPairs().value();
        meta.modelName = this.getModelName();
        meta.pluralName = this.getPluralName();
        meta.relations = _.chain(this.getRelations()).toPairs().map(function (pair) {
          var name = pair[0];
          var relation = pair[1];
          var RelatedModel = relation.modelClass;
          var relatedModelName = relation.model;

          if (!RelatedModel) {
            RelatedModel = Registry.getInstance().get('models.' + relatedModelName);
          }

          if (!RelatedModel) {
            throw relatedModelName + ' is not defined';
          }

          var meta = RelatedModel.getMeta();
          relation.meta = meta;

          return [name, relation];
        }).fromPairs().value();

        this._meta = meta;
      }

      // TODO: this is heavy!!!
      return _.cloneDeep(this._meta);
    }

    // Data management methods

  }, {
    key: 'getConnector',
    value: function getConnector() {
      var connector = this.connector;
      if (!connector) {
        throw 'Must have connector';
      }
      return connector;
    }
  }, {
    key: 'findOne',
    value: function findOne() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      filter.limit = 1;
      return this.findAll(filter, options).then(function (results) {
        if (!results.length) {
          return null;
        }

        return results[0];
      });
    }
  }, {
    key: 'findAll',
    value: function findAll(filter) {
      var _this7 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.getConnector().read(filter, this.getMeta(), options).then(function (results) {
        if (!_.isArray(results) || !_.size(results)) {
          return [];
        }

        var promises = _.map(results, function (result) {
          var instance = new _this7(result);
          return _this7.runHook('afterFind', instance, options).then(function () {
            return instance;
          });
        });

        return Promise.all(promises);
      });
    }
  }, {
    key: 'findByPk',
    value: function findByPk(value) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var pk = this.getPrimaryKey();
      var where = {};
      where[pk] = value;
      return this.findOne({
        where: where
      }, _.extend({}, options, {
        primaryKeyValue: value
      }));
    }
  }, {
    key: 'deleteAll',
    value: function deleteAll(filter) {
      var _this8 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.runHook('beforeDelete', filter, options).then(function () {
        return _this8.getConnector().delete(filter, _this8.getMeta(), options).then(function (result) {
          return _this8.runHook('afterDelete', filter, options).then(function () {
            return result;
          });
        });
      });
    }
  }, {
    key: 'getRelations',
    value: function getRelations() {
      return _.cloneDeep(this.relations) || {};
    }
  }, {
    key: 'getApiName',
    value: function getApiName() {
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

  }, {
    key: 'getEndPoints',
    value: function getEndPoints() {
      var userDefinedEndPoints = this.endPoints || {};
      return _.extend({}, this.getDefaultEndPoints(), userDefinedEndPoints);
    }

    /**
     * A list of default end points
     * @return {Object}
     */

  }, {
    key: 'getDefaultEndPoints',
    value: function getDefaultEndPoints() {
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
  }, {
    key: '_runHooks',
    value: function _runHooks(hooks, ignoreError, args, result) {
      var _this9 = this;

      if (!hooks || !hooks.length) {
        return Promise.resolve(true);
      }

      var hook = hooks.shift();

      return util.tryPromise(hook.call(this, args, result)).catch(function (e) {
        if (ignoreError) {
          return false;
        }
        return Promise.reject(e);
      }).then(function () {
        return _this9._runHooks(hooks, ignoreError, args, result);
      });
    }
  }, {
    key: 'executeApi',
    value: function executeApi(methodName, args, context) {
      var _this10 = this;

      var method = this[methodName];

      if (!method) {
        var error = new Error(methodName + ' is not found');
        error.httpCode = error.code = 500;
        return Promise.reject(error);
      }

      var promises = [];

      // Processes before hooks, skips the process when there is a rejection
      var beforeHooks = (this._beforeHooks || {})[methodName];
      return this._runHooks(beforeHooks, false, args).then(function () {
        return util.tryPromise(method.call(_this10, args, context));
      }).then(function (result) {
        // Processes after hooks and ignores rejection
        var afterHooks = (_this10._afterHooks || {})[methodName];
        return _this10._runHooks(afterHooks, true, args, result).then(function () {
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

  }, {
    key: 'beforeApi',
    value: function beforeApi(methodName, fn) {
      this._beforeHooks = this._beforeHooks || {};
      if (!this._beforeHooks[methodName]) {
        this._beforeHooks[methodName] = [];
      }

      this._beforeHooks[methodName].push(fn);
    }
  }, {
    key: 'clearBeforeApiHooks',
    value: function clearBeforeApiHooks() {
      this._beforeHooks = {};
    }

    /**
     * This method is called after the execution of an api handler
     * @param  {String}   methodName method name
     * @param  {Function} fn         the funciton to be executed
     * @return {Promise}
     */

  }, {
    key: 'afterApi',
    value: function afterApi(methodName, fn) {
      this._afterHooks = this._afterHooks || {};
      if (!this._afterHooks[methodName]) {
        this._afterHooks[methodName] = [];
      }

      this._afterHooks[methodName].push(fn);
    }
  }, {
    key: 'clearAfterApiHooks',
    value: function clearAfterApiHooks() {
      this._afterHooks = {};
    }

    // Default API handlers

  }, {
    key: 'list',
    value: function list(args, context) {
      return this.findAll(args);
    }
  }, {
    key: 'find',
    value: function find(args, context) {
      return this.findByPk(args[this.getPrimaryKey()]);
    }
  }, {
    key: 'create',
    value: function create(args, context) {
      var instance = new this(args);
      return instance.save();
    }
  }, {
    key: 'update',
    value: function update(args, context) {
      var instance = new this(args);
      return instance.save();
    }
  }, {
    key: 'delete',
    value: function _delete(args, context) {
      var instance = new this(args);
      return instance.delete();
    }
  }]);

  return ActiveRecord;
})(Model);

module.exports = ActiveRecord;