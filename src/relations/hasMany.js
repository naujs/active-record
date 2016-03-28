'use strict';

var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash')
  , Relation = require('./Relation');

class HasMany extends Relation {
  _getReferenceKeyValue() {
    let instance = this.getModelInstance();
    return instance[this.getRelation().referenceKey] || instance.getPrimaryKeyValue();
  }

  _generateWhereCondition(where = {}) {
    where[this.getRelation().foreignKey] = this._getReferenceKeyValue();
    return where;
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
