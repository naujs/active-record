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

  setValue(value) {
    if (!value) this._value = null;
    this._value = value;
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
