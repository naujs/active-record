'use strict';

var DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash')
  , Relation = require('./Relation');

class HasMany extends Relation {
  _getReferenceKeyValue() {
    var instance = this.getModelInstance();
    return instance[this.getRelation().referenceKey] || instance.getPrimaryKeyValue();
  }

  _generateWhereCondition(where = {}) {
    where[this.getRelation().foreignKey] = this._getReferenceKeyValue();
    return where;
  }

  create(attributes = {}) {
    var instance = this.getModelInstance();
    var relation = this.getRelation();
    var TargetModel = this.getTargetModelClass();
    var referenceKey = relation.referenceKey || instance.getClass().getPrimaryKey();
    var foreignKey = relation.foreignKey;

    var extraAtrs = {};
    extraAtrs[foreignKey] = instance[referenceKey];

    var targetModel = new TargetModel(_.extend({}, attributes, extraAtrs));

    return targetModel.save();
  }

  find(filter = {}) {
    filter.where = this._generateWhereCondition(filter.where);
    return this.getTargetModelClass().findAll(filter);
  }

  delete(filter = {}) {
    filter.where = this._generateWhereCondition(filter.where);
    return this.getTargetModelClass().deleteAll(filter);
  }
}

module.exports = HasMany;
