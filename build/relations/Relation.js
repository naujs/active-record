'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash'),
    Registry = require('@naujs/registry');

var Relation = (function () {
  function Relation(instance, relation, value) {
    _classCallCheck(this, Relation);

    this._relation = relation;
    this._instance = instance;
    this.setValue(value);
  }

  _createClass(Relation, [{
    key: 'getRelation',
    value: function getRelation() {
      return this._relation;
    }
  }, {
    key: 'getModelInstance',
    value: function getModelInstance() {
      return this._instance;
    }
  }, {
    key: 'getTargetModelClass',
    value: function getTargetModelClass() {
      if (!this.TargetModelClass) {
        this.TargetModelClass = Registry.getModel(this.getRelation().model);
      }

      return this.TargetModelClass;
    }
  }, {
    key: '_createInstanceFromTargetModel',
    value: function _createInstanceFromTargetModel(value) {
      var TargetModel = this.getTargetModelClass();
      if (value instanceof TargetModel) {
        return value;
      }
      return new TargetModel(value);
    }
  }, {
    key: 'setValue',
    value: function setValue(value) {
      var _this = this;

      if (!value) {
        this._value = null;
        return this;
      }
      var TargetModel = this.getTargetModelClass();

      if (_.isArray(value)) {
        this._value = _.map(value, function (v) {
          return _this._createInstanceFromTargetModel(v);
        });
      } else {
        this._value = this._createInstanceFromTargetModel(value);
      }
      return this;
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this._value;
    }
  }, {
    key: 'methods',
    value: function methods() {
      return ['find', 'delete', 'update', 'create'];
    }
  }, {
    key: 'asFunction',
    value: function asFunction() {
      var _this2 = this;

      function relatedModel() {
        var value = this.getValue();
        if (value) return value;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return this.find.apply(this, args);
      };

      var bound = relatedModel.bind(this);
      bound.getValue = this.getValue.bind(this);

      _.each(this.methods(), function (name) {
        bound[name] = _this2[name].bind(_this2);
      });

      return bound;
    }
  }, {
    key: 'find',
    value: function find() {
      throw 'Not implemented';
    }
  }, {
    key: 'delete',
    value: function _delete() {
      throw 'Not implemented';
    }
  }, {
    key: 'update',
    value: function update() {
      throw 'Not implemented';
    }
  }, {
    key: 'create',
    value: function create() {
      throw 'Not implemented';
    }
  }]);

  return Relation;
})();

module.exports = Relation;