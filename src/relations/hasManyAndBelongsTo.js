var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash');

module.exports = function hasManyAndBelongsTo(instance, relation, value) {
  var TargetModel = Registry.getModel(relation.model);
  var ThroughModel = Registry.getModel(relation.through);
  if (!ThroughModel) {
    console.warn(`Related model for the relation is not found`);
    return null;
  }
  var _value = value;

  function relatedModel(filter = {}, options = {}) {
    if (_value) {
      return _value;
    }
    return relatedModel.findAll(filter, options);
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

  function getTargetRelation() {
    return _.chain(ThroughModel.getRelations()).toPairs().map((pair) => {
      if (pair[1].model === relation.model) {
        return pair[1];
      }
      return null;
    }).compact().first().value();
  }

  relatedModel.findAll = function(filter = {}, options = {}) {
    filter.where = filter.where || {};

    let criteria = new DbCriteria(ThroughModel, {}, options);
    let where = generateWhereCondition(where);
    criteria.where(where);

    let targetRelation = getTargetRelation();
    filter.where[targetRelation.referenceKey || TargetModel.getPrimaryKey()] = {
      in: criteria
    };

    return TargetModel.findAll(filter, options);
  };

  relatedModel.findOne = function(filter = {}, options = {}) {
    filter.limit = 1;
    return this.findAll(filter).then((results) => {
      return results[0] || null;
    });
  };

  relatedModel.delete = function(filter = {}, options = {}) {
    let criteria = new DbCriteria(TargetModel, filter, options);
    let targetRelation = getTargetRelation();
    criteria.fields(targetRelation.referenceKey || TargetModel.getPrimaryKey());

    let mainWhere = {};
    mainWhere[targetRelation.foreignKey] = {
      in: criteria
    };
    mainWhere[relation.foreignKey] = getInstanceReferenceKeyValue();

    return ThroughModel.deleteAll({
      where: mainWhere
    }, options);
  };

  relatedModel.update = function(filter = {}, attributes = {}, options = {}) {

  };

  return relatedModel;
};