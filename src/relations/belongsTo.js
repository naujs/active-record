'use strict';

var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , Relation = require('./Relation')
  , _ = require('lodash');

class BelongsTo extends Relation {
  _generateWhereCondition() {
    var relation = this.getRelation();
    var where = {};
    var referenceKey = relation.referenceKey
      || this.getTargetModelClass().getPrimaryKey();
    where[referenceKey] = this.getModelInstance()[relation.foreignKey];
    return where;
  }

  create(attributes = {}) {
    var instance = this.getModelInstance();
    var relation = this.getRelation();
    var referenceKey = relation.referenceKey
      || this.getTargetModelClass().getPrimaryKey();

    var foreignKey = relation.foreignKey;

    var TargetModel = this.getTargetModelClass();
    var targetModel = new TargetModel(attributes);

    return targetModel.save().then((target) => {
      instance[foreignKey] = target[referenceKey];
      return instance.save().then(() => {
        return target;
      });
    });
  }

  find(filter = {}) {
    var _filter = {};
    _filter.where = this._generateWhereCondition();
    if (filter.include) _filter.include = filter.include;

    return this.getTargetModelClass().findOne(_filter);
  }

  delete() {
    return this.getTargetModelClass().deleteOne({
      where: this._generateWhereCondition()
    });
  }
}

module.exports = BelongsTo;
