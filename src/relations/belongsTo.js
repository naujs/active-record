var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash');

module.exports = function belongsTo(instance, relation, value) {
  var TargetModel = Registry.getModel(relation.model);
  var _value = value;

  function relatedModel() {
    if (_value) {
      return _value;
    }

    return relatedModel.find();
  };

  relatedModel.create = function() {

  };

  function getInstanceReferenceKeyValue() {
    return instance[relation.referenceKey] || instance.getPrimaryKeyValue();
  }

  function generateWhereCondition(where) {
    // it's belongsTo relation, so there is no need for extra where condition
    where = {};
    let referenceKey = relation.referenceKey
      || TargetModel.getPrimaryKey();
    where[referenceKey] = instance[relation.foreignKey];
    return where;
  }

  relatedModel.find = function() {
    return TargetModel.findOne({
      where: generateWhereCondition()
    });
  };

  relatedModel.delete = function() {
    return TargetModel.deleteOne({
      where: generateWhereCondition()
    });
  };

  relatedModel.update = function(filter = {}, attributes = {}, options = {}) {

  };

  return relatedModel;
};
