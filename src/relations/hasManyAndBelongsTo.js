'use strict';

var DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash')
  , HasMany = require('./HasMany');

class HasManyAndBelongsTo extends HasMany {
  getThroughModelClass() {
    if (!this.ThroughModel) {
      this.ThroughModel = this.getRelation().through;
    }
    return this.ThroughModel;
  }

  _getTargetRelation() {
    if (!this._targetRelation) {
      let compare = this.getRelation().model;
      this._targetRelation = _.chain(this.getThroughModelClass().getRelations())
      .toPairs().map((pair) => {
        if (pair[1].model === compare) {
          return pair[1];
        }
        return null;
      }).compact().first().value();
    }
    return this._targetRelation;
  }

  find(filter = {}) {
    var TargetModel = this.getTargetModelClass();
    filter.where = filter.where || {};

    var criteria = new DbCriteria(this.getThroughModelClass(), {});
    var where = this._generateWhereCondition(where);
    criteria.where(where);

    var targetRelation = this._getTargetRelation();
    filter.where[targetRelation.referenceKey || TargetModel.getPrimaryKey()] = {
      in: criteria
    };

    return TargetModel.findAll(filter);
  }

  delete(filter = {}) {
    var TargetModel = this.getTargetModelClass();

    var criteria = new DbCriteria(TargetModel, filter);
    var targetRelation = this._getTargetRelation();
    criteria.fields(targetRelation.referenceKey || TargetModel.getPrimaryKey());

    var mainWhere = {};
    mainWhere[targetRelation.foreignKey] = {
      in: criteria
    };
    mainWhere[this.getRelation().foreignKey] = this._getReferenceKeyValue();

    return this.getThroughModelClass().deleteAll({
      where: mainWhere
    });
  }
}

module.exports = HasManyAndBelongsTo;
