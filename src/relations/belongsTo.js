'use strict';

var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , Relation = require('./Relation')
  , _ = require('lodash');

class BelongsTo extends Relation {
  _generateWhereCondition() {
    let relation = this.getRelation();
    let where = {};
    let referenceKey = relation.referenceKey
      || this.getTargetModelClass().getPrimaryKey();
    where[referenceKey] = this.getModelInstance()[relation.foreignKey];
    return where;
  }

  find() {
    return this.getTargetModelClass().findOne({
      where: this._generateWhereCondition()
    });
  }

  delete() {
    return this.getTargetModelClass().deleteOne({
      where: this._generateWhereCondition()
    });
  }
}

module.exports = BelongsTo;
