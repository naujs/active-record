'use strict';

var Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria'),
    _ = require('lodash');

module.exports = function constructRelation(instance, relation, values) {
  var connector = instance.getClass().getConnector();
  var CurrentModel = instance.getClass();
  var TargetModel = Registry.getModel(relation.model);
  var ThroughModel = null;

  if (relation.type == 'hasManyAndBelongsTo') {
    ThroughModel = Registry.getModel(relation.through);
    if (!ThroughModel) {
      console.warn('Related model for the relation is not found');
      return null;
    }
  }

  function relatedModel() {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (relatedModel._values) {
      return relatedModel._values;
    }

    switch (relation.type) {
      case 'hasOne':
      case 'belongsTo':
        return relatedModel.findOne(filter, options);
      default:
        return relatedModel.findAll(filter, options);
    }
  };

  relatedModel._values = values;

  relatedModel.create = function () {};

  function getInstanceReferenceKeyValue() {
    return instance[relation.referenceKey] || instance.getPrimaryKeyValue();
  }

  // Basic where condition to find TargetModel of a relation
  function generateWhereCondition(where) {
    where = where || {};
    switch (relation.type) {
      case 'hasOne':
      case 'hasMany':
      case 'hasManyAndBelongsTo':
        var referenceKeyValue = getInstanceReferenceKeyValue();
        where[relation.foreignKey] = referenceKeyValue;
        break;
      case 'belongsTo':
        // it's belongsTo relation, so there is no need for extra where condition
        where = {};
        var referenceKey = relation.referenceKey || TargetModel.getPrimaryKey();
        where[referenceKey] = instance[relation.foreignKey];
        break;
    }
    return where;
  }

  function getTargetRelationForHasManyAndBelongsToRelation() {
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
    var where = {};
    var criteria = new DbCriteria(ThroughModel || TargetModel, {}, options);
    var referenceKey = null;
    var referenceKeyValue = null;

    switch (relation.type) {
      case 'hasOne':
      case 'hasMany':
        filter.where = generateWhereCondition(filter.where);
        return TargetModel.findAll(filter, options);
      case 'belongsTo':
        filter.where = generateWhereCondition(filter.where);
        return TargetModel.findOne(filter, options);
      case 'hasManyAndBelongsTo':
        where = generateWhereCondition(where);
        criteria.where(where);

        var targetRelation = getTargetRelationForHasManyAndBelongsToRelation();
        filter.where[targetRelation.referenceKey || TargetModel.getPrimaryKey()] = {
          in: criteria
        };

        return TargetModel.findAll(filter, options);
    }
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

    var criteria = null;
    var referenceKeyValue = null;
    switch (relation.type) {
      case 'belongsTo':
      case 'hasOne':
        filter.where = generateWhereCondition(filter.where);
        return TargetModel.deleteOne(filter, options);
      case 'hasMany':
        filter.where = generateWhereCondition(filter.where);
        return TargetModel.deleteAll(filter, options);
      case 'hasManyAndBelongsTo':
        criteria = new DbCriteria(TargetModel, filter, options);
        var targetRelation = getTargetRelationForHasManyAndBelongsToRelation();
        criteria.fields(targetRelation.referenceKey || TargetModel.getPrimaryKey());

        var mainWhere = {};
        mainWhere[targetRelation.foreignKey] = {
          in: criteria
        };
        mainWhere[relation.foreignKey] = getInstanceReferenceKeyValue();

        return ThroughModel.deleteAll({
          where: mainWhere
        }, options);
    }
  };

  relatedModel.update = function () {
    var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var attributes = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
  };

  return relatedModel;
};