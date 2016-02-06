'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Model = require('@naujs/model'),
    _ = require('lodash'),
    util = require('@naujs/util');

// Helper methods
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
  options.primaryKeyValue = executeOrReturnUndefined(instance, 'getPrimaryKeyValue');
  options.properties = _.chain(Class.getProperties()).cloneDeep().toPairs().map(function (pair) {
    var options = pair[1];
    options.type = options.type.toJSON();
    return pair;
  }).fromPairs().value();
  options.modelName = Class.getModelName();
  options.pluralName = Class.getPluralName();

  return options;
}

function onAfterFind(instance, options) {
  var onAfterFind = instance.onAfterFind(options);

  return util.tryPromise(onAfterFind).then(function () {
    return instance;
  });
}

function onBeforeCreate(instance, options) {
  var onBeforeCreate = instance.onBeforeCreate(options);

  return util.tryPromise(onBeforeCreate).then(function (result) {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterCreate(instance, options) {
  var onAfterCreate = instance.onAfterCreate(options);

  return util.tryPromise(onAfterCreate).then(function () {
    return instance;
  });
}

function onBeforeUpdate(instance, options) {
  var onBeforeUpdate = instance.onBeforeUpdate(options);

  return util.tryPromise(onBeforeUpdate).then(function (result) {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterUpdate(instance, options) {
  var onAfterUpdate = instance.onAfterUpdate(options);

  return util.tryPromise(onAfterUpdate).then(function () {
    return instance;
  });
}

function onBeforeDelete(instance, options) {
  var onBeforeDelete = instance.onBeforeDelete(options);

  return util.tryPromise(onBeforeDelete).then(function (result) {
    if (!result) {
      return false;
    }

    return instance;
  });
}

function onAfterDelete(instance, options) {
  var onAfterDelete = instance.onAfterDelete(options);

  return util.tryPromise(onAfterDelete).then(function () {
    return instance;
  });
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

    // Lifecycle hooks

  }, {
    key: 'onAfterFind',
    value: function onAfterFind() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this;
    }
  }, {
    key: 'onBeforeCreate',
    value: function onBeforeCreate() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return true;
    }
  }, {
    key: 'onAfterCreate',
    value: function onAfterCreate() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this;
    }
  }, {
    key: 'onBeforeUpdate',
    value: function onBeforeUpdate() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return true;
    }
  }, {
    key: 'onAfterUpdate',
    value: function onAfterUpdate() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this;
    }
  }, {
    key: 'onBeforeSave',
    value: function onBeforeSave() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return true;
    }
  }, {
    key: 'onAfterSave',
    value: function onAfterSave() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this;
    }
  }, {
    key: 'onBeforeDelete',
    value: function onBeforeDelete() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return true;
    }
  }, {
    key: 'onAfterDelete',
    value: function onAfterDelete() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this;
    }

    // Data management methods

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

        return onBeforeCreate(_this3, options).then(function (result) {
          if (!result) {
            return false;
          }

          var attributes = _this3.getPersistableAttributes();

          return _this3.getClass().getConnector().create(attributes, buildConnectorOptions(_this3, options)).then(function (result) {
            _this3.setAttributes(result);
            return onAfterCreate(_this3, options);
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

        return onBeforeUpdate(_this4, options).then(function (result) {
          if (!result) {
            return false;
          }

          var attributes = _this4.getPersistableAttributes();
          var filter = {};
          filter.where = {};
          var primaryKey = _this4.getClass().getPrimaryKey();
          filter.where[primaryKey] = _this4.getPrimaryKeyValue();

          return _this4.getClass().getConnector().update(filter, attributes, buildConnectorOptions(_this4, options)).then(function (result) {
            _this4.setAttributes(result);
            return onAfterUpdate(_this4, options);
          });
        });
      });
    }
  }, {
    key: 'save',
    value: function save() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return this.create(options);
      }
      return this.update(options);
    }
  }, {
    key: 'delete',
    value: function _delete() {
      var _this5 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return Promise.reject('Cannot delete new model');
      }

      return onBeforeDelete(this, options).then(function (result) {
        if (!result) {
          return false;
        }

        var name = _this5.getClass().getModelName();
        var filter = {};
        filter.where = {};
        var primaryKey = _this5.getClass().getPrimaryKey();
        filter.where[primaryKey] = _this5.getPrimaryKeyValue();

        return _this5.getClass().getConnector().delete(filter, buildConnectorOptions(_this5, options)).then(function (result) {
          return onAfterDelete(_this5, options);
        });
      });
    }
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
      var _this6 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.getConnector().read(filter, buildConnectorOptions(this, options)).then(function (results) {
        if (!_.isArray(results) || !_.size(results)) {
          return [];
        }

        var promises = _.map(results, function (result) {
          var instance = new _this6(result);
          return onAfterFind(instance, options).then(function () {
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
      }, options);
    }
  }, {
    key: 'deleteAll',
    value: function deleteAll(filter) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.getConnector().delete(filter, buildConnectorOptions(this, options));
    }
  }]);

  return ActiveRecord;
})(Model);

module.exports = ActiveRecord;