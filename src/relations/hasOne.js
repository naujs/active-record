var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash');

module.exports = function hasMany(instance, relation, value) {
  var TargetModel = Registry.getModel(relation.model);
  var _value = value;

  function relatedModel(filter = {}, options = {}) {
    if (_value) {
      return _value;
    }

    return relatedModel.find(filter, options);
  };

  relatedModel.create = function() {

  };

  function getInstanceReferenceKeyValue() {
    return instance[relation.referenceKey] || instance.getPrimaryKeyValue();
  }

  // Basic where condition to find TargetModel of a relation
  function generateWhereCondition(where) {
    where = where || {};
    let referenceKeyValue = getInstanceReferenceKeyValue();
    where[relation.foreignKey] = referenceKeyValue;
    return where;
  }

  relatedModel.find = function() {
    let where = generateWhereCondition();
    return TargetModel.findOne({
      where: where
    });
  };

  relatedModel.delete = function() {
    let where = generateWhereCondition();
    return TargetModel.deleteOne({
      where: where
    });
  };

  relatedModel.update = function(filter = {}, attributes = {}, options = {}) {

  };

  return relatedModel;
};
