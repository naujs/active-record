var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria')
  , _ = require('lodash')
  , HasMany = require('./HasMany');

class HasOne extends HasMany {
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

module.exports = HasOne;
