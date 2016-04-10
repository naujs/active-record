'use strict';
var _ = require('lodash')
  , Registry = require('@naujs/registry');

class Relation {
  constructor(instance, relation, value) {
    this._relation = relation;
    this._instance = instance;
    this.setValue(value);
  }

  getRelation() {
    return this._relation;
  }

  getModelInstance() {
    return this._instance;
  }

  getTargetModelClass() {
    if (!this.TargetModelClass) {
      this.TargetModelClass = Registry.getModel(this.getRelation().model);
    }

    return this.TargetModelClass;
  }

  _createInstanceFromTargetModel(value) {
    var TargetModel = this.getTargetModelClass();
    if (value instanceof TargetModel) {
      return value;
    }
    return new TargetModel(value);
  }

  setValue(value) {
    if (!value) {
      this._value = null;
      return this;
    }
    var TargetModel = this.getTargetModelClass();

    if (_.isArray(value)) {
      this._value = _.map(value, (v) => {
        return this._createInstanceFromTargetModel(v);
      });
    } else {
      this._value = this._createInstanceFromTargetModel(value);
    }
    return this;
  }

  getValue() {
    return this._value;
  }

  methods() {
    return [
      'find',
      'delete',
      'update',
      'create'
    ];
  }

  asFunction() {
    function relatedModel(...args) {
      var value = this.getValue();
      if (value) return value;
      return this.find.apply(this, args);
    };

    var bound = relatedModel.bind(this);
    bound.getValue = this.getValue.bind(this);

    _.each(this.methods(), (name) => {
      bound[name] = this[name].bind(this);
    });

    return bound;
  }

  find() {
    throw 'Not implemented';
  }

  delete() {
    throw 'Not implemented';
  }

  update() {
    throw 'Not implemented';
  }

  create() {
    throw 'Not implemented';
  }
}

module.exports = Relation;
