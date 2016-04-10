'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Model = require('@naujs/model'),
    _ = require('lodash'),
    util = require('@naujs/util'),
    Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria');

var Api = require('./Api'),
    ListApi = require('./api/ListApi'),
    ReadApi = require('./api/ReadApi'),
    CreateApi = require('./api/CreateApi'),
    UpdateApi = require('./api/UpdateApi'),
    DeleteApi = require('./api/DeleteApi'),
    CountApi = require('./api/CountApi');

var relationFunctions = {};
_.each(['belongsTo', 'hasOne', 'hasMany', 'hasManyAndBelongsTo'], function (name) {
  var capitalized = name.charAt(0).toUpperCase() + name.substr(1);
  relationFunctions[name] = require('./relations/' + capitalized);
});

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

// TODO: remove options from all methods if not used

var ActiveRecord = (function (_Model) {
  _inherits(ActiveRecord, _Model);

  // TODO: fix this constructor to define all the extra properties first
  // then call setAttributes (from super) later
  // Right now, it calls setAttributes twice

  function ActiveRecord() {
    var attributes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, ActiveRecord);

    // set primary key if available

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ActiveRecord).call(this, attributes));

    var pk = _this.getClass().getPrimaryKey();
    ActiveRecord.defineProperty(_this, pk);
    _this.setPrimaryKeyValue(attributes[pk]);

    // set foreign keys
    var foreignKeys = _this.getClass().getForeignKeys();
    _.each(foreignKeys, function (key) {
      ActiveRecord.defineProperty(_this, key);
    });
    _this.setForeignAttributes(attributes);

    // set relations
    // relations are stored differently than normal attributes
    _this._relations = {};
    var instance = _this;
    var relations = _this.getClass().getRelations();
    _.each(relations, function (relation, name) {
      Object.defineProperty(_this, name, {
        get: function get() {
          return instance._relations[name];
        },

        set: function set(value) {
          instance._relations[name] = value;
        }
      });
    });
    _this.setRelationAttributes(attributes);
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
      this.setForeignAttributes(attributes);
      this.setRelationAttributes(attributes);
      return this;
    }
  }, {
    key: 'setForeignAttributes',
    value: function setForeignAttributes() {
      var _this2 = this;

      var attributes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var foreignKeys = this.getClass().getForeignKeys();

      _.each(foreignKeys, function (key) {
        if (attributes[key] !== void 0) {
          _this2[key] = attributes[key];
        }
      });

      return this;
    }
  }, {
    key: 'setRelationAttributes',
    value: function setRelationAttributes() {
      var _this3 = this;

      var attributes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var relations = this.getClass().getRelations();
      _.each(relations, function (relation, name) {
        var RelationFunction = relationFunctions[relation.type];
        _this3[name] = new RelationFunction(_this3, relation, attributes[name]).asFunction();
      });
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
      var _this4 = this;

      var properties = this.getClass().getProperties();
      var persitableProperties = this.getClass().getAllProperties();
      var persistableAttributes = {};

      _.each(persitableProperties, function (name) {
        if (_this4[name] != void 0) {
          persistableAttributes[name] = _this4[name];
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

    // Data management methods

  }, {
    key: 'getConnector',
    value: function getConnector() {
      return this.getClass().getConnector();
    }
  }, {
    key: 'create',
    value: function create() {
      var _this5 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (!this.isNew()) {
        return Promise.reject('Can only create new models');
      }

      return this.validate(options).then(function (result) {
        if (!result) {
          return false;
        }

        return _this5.runHook('beforeCreate', {
          instance: _this5
        }, options).then(function () {
          var attributes = _this5.getPersistableAttributes();
          var criteria = new DbCriteria(_this5, {}, options);

          criteria.setAttributes(attributes);
          return _this5.getConnector().create(criteria, options).then(function (result) {
            _this5.setAttributes(result);

            return _this5.runHook('afterCreate', {
              instance: _this5
            }, options).then(function () {
              return _this5;
            });
          });
        });
      });
    }
  }, {
    key: 'update',
    value: function update() {
      var _this6 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return Promise.reject('Cannot update new model');
      }

      return this.validate(options).then(function (result) {
        if (!result) {
          return false;
        }

        return _this6.runHook('beforeUpdate', {
          instance: _this6
        }, options).then(function (result) {
          if (!result) {
            return false;
          }

          var attributes = _this6.getPersistableAttributes();
          var filter = {};
          filter.where = {};
          var primaryKey = _this6.getClass().getPrimaryKey();
          filter.where[primaryKey] = _this6.getPrimaryKeyValue();

          var criteria = new DbCriteria(_this6, filter, options);
          criteria.setAttributes(attributes);

          return _this6.getConnector().update(criteria, options).then(function (result) {
            _this6.setAttributes(result);

            return _this6.runHook('afterUpdate', {
              instance: _this6
            }, options).then(function () {
              return _this6;
            });
          });
        });
      });
    }
  }, {
    key: 'save',
    value: function save() {
      var _this7 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var method = 'update';
      if (this.isNew()) {
        method = 'create';
      }

      return this.runHook('beforeSave', {
        instance: this
      }, options).then(function () {
        return _this7[method].call(_this7, options);
      }).then(function () {
        return _this7.runHook('afterSave', {
          instance: _this7
        }, options).then(function () {
          return _this7;
        }, function () {
          return _this7;
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete() {
      var _this8 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isNew()) {
        return Promise.reject('Cannot delete new model');
      }

      return this.runHook('beforeDelete', {
        instance: this
      }, options).then(function (result) {
        var filter = {};
        filter.where = {};
        var primaryKey = _this8.getClass().getPrimaryKey();
        filter.where[primaryKey] = _this8.getPrimaryKeyValue();
        var criteria = new DbCriteria(_this8, filter, options);

        return _this8.getConnector().delete(criteria, options).then(function (result) {
          return _this8.runHook('afterDelete', {
            instance: _this8
          }, options).then(function () {
            return _this8;
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
    key: 'getForeignKeys',
    value: function getForeignKeys() {
      return _.chain(this.getRelations()).map(function (relation) {
        // TODO: use constants here
        if (relation.type == 'belongsTo') {
          return relation.foreignKey;
        }
        return null;
      }).compact().value();
    }
  }, {
    key: 'getAllProperties',
    value: function getAllProperties() {
      if (!this._allProperties) {
        var properties = _.chain(this.getProperties()).clone().toPairs().filter(function (pair) {
          return pair[1].persistable !== false;
        }).fromPairs().keys().value();
        properties.push(this.getPrimaryKey());
        this._allProperties = _.union(properties, this.getForeignKeys());
      }
      return this._allProperties;
    }
  }, {
    key: 'getConnector',
    value: function getConnector() {
      var connector = this.connector || Registry.getInstance().get('ActiveRecord.connector');
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
      var _this9 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.getConnector().read(new DbCriteria(this, filter, options), options).then(function (results) {
        if (!_.isArray(results) || !_.size(results)) {
          return [];
        }

        var instances = _.map(results, function (result) {
          return new _this9(result);
        });

        return _this9.runHook('afterFind', {
          instances: instances,
          filter: filter
        }, options).then(function () {
          return instances;
        });
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
      var _this10 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this.runHook('beforeDelete', {
        filter: filter
      }, options).then(function () {
        var criteria = new DbCriteria(_this10, filter, options);
        return _this10.getConnector().delete(criteria, options).then(function (results) {
          return _this10.runHook('afterDelete', {
            filter: filter,
            deleted: results
          }, options).then(function () {
            return results;
          });
        });
      });
    }
  }, {
    key: 'deleteOne',
    value: function deleteOne() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      filter.limit = 1;
      return this.deleteAll(filter, options).then(function (results) {
        return results[0] || null;
      });
    }
  }, {
    key: 'deleteByPk',
    value: function deleteByPk(pk) {
      var filter = {};
      filter.where = {};
      var primaryKey = this.getPrimaryKey();
      filter.where[primaryKey] = pk;

      return deleteOne(filter);
    }
  }, {
    key: 'count',
    value: function count(filter) {
      var criteria = new DbCriteria(this, filter);
      return this.getConnector().count(criteria);
    }
  }, {
    key: 'getRelations',
    value: function getRelations() {
      return _.clone(this.relations) || {};
    }
  }]);

  return ActiveRecord;
})(Model);

ActiveRecord.Api = Api;

ActiveRecord.mixin({}, Api.buildMixin({
  defaultApi: function defaultApi() {
    return [new ListApi(this), new ReadApi(this), new CreateApi(this), new UpdateApi(this), new DeleteApi(this), new CountApi(this)];
  },
  apiName: function apiName() {
    return this.getPluralName();
  }
}));

module.exports = ActiveRecord;