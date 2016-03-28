'use strict';

var Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria'),
    _ = require('lodash');

module.exports = function hasMany(instance, relation, value) {
  var TargetModel = Registry.getModel(relation.model);
  var _value = value;

  function relatedModel() {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (_value) {
      return _value;
    }

    return relatedModel.find(filter, options);
  };

  relatedModel.create = function () {};

  function getInstanceReferenceKeyValue() {
    return instance[relation.referenceKey] || instance.getPrimaryKeyValue();
  }

  // Basic where condition to find TargetModel of a relation
  function generateWhereCondition(where) {
    where = where || {};
    var referenceKeyValue = getInstanceReferenceKeyValue();
    where[relation.foreignKey] = referenceKeyValue;
    return where;
  }

  relatedModel.find = function () {
    var where = generateWhereCondition();
    return TargetModel.findOne({
      where: where
    });
  };

  relatedModel.delete = function () {
    var where = generateWhereCondition();
    return TargetModel.deleteOne({
      where: where
    });
  };

  relatedModel.update = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var attributes = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
  };

  return relatedModel;
};