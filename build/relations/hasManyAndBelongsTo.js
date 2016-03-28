'use strict';

var Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria'),
    _ = require('lodash');

module.exports = function hasManyAndBelongsTo(instance, relation, value) {
  var TargetModel = Registry.getModel(relation.model);
  var ThroughModel = Registry.getModel(relation.through);
  if (!ThroughModel) {
    console.warn('Related model for the relation is not found');
    return null;
  }
  var _value = value;

  function relatedModel() {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (_value) {
      return _value;
    }
    return relatedModel.findAll(filter, options);
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

  function getTargetRelation() {
    return _.chain(ThroughModel.getRelations()).toPairs().map(function (pair) {
      if (pair[1].model === relation.model) {
        return pair[1];
      }
      return null;
    }).compact().first().value();
  }

  relatedModel.findAll = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    filter.where = filter.where || {};

    var criteria = new DbCriteria(ThroughModel, {}, options);
    var where = generateWhereCondition(where);
    criteria.where(where);

    var targetRelation = getTargetRelation();
    filter.where[targetRelation.referenceKey || TargetModel.getPrimaryKey()] = {
      in: criteria
    };

    return TargetModel.findAll(filter, options);
  };

  relatedModel.findOne = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    filter.limit = 1;
    return this.findAll(filter).then(function (results) {
      return results[0] || null;
    });
  };

  relatedModel.delete = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var criteria = new DbCriteria(TargetModel, filter, options);
    var targetRelation = getTargetRelation();
    criteria.fields(targetRelation.referenceKey || TargetModel.getPrimaryKey());

    var mainWhere = {};
    mainWhere[targetRelation.foreignKey] = {
      in: criteria
    };
    mainWhere[relation.foreignKey] = getInstanceReferenceKeyValue();

    return ThroughModel.deleteAll({
      where: mainWhere
    }, options);
  };

  relatedModel.update = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var attributes = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
  };

  return relatedModel;
};