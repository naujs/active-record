'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria'),
    Relation = require('./Relation'),
    _ = require('lodash');

var BelongsTo = (function (_Relation) {
  _inherits(BelongsTo, _Relation);

  function BelongsTo() {
    _classCallCheck(this, BelongsTo);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(BelongsTo).apply(this, arguments));
  }

  _createClass(BelongsTo, [{
    key: '_generateWhereCondition',
    value: function _generateWhereCondition() {
      var relation = this.getRelation();
      var where = {};
      var referenceKey = relation.referenceKey || this.getTargetModelClass().getPrimaryKey();
      where[referenceKey] = this.getModelInstance()[relation.foreignKey];
      return where;
    }
  }, {
    key: 'find',
    value: function find() {
      return this.getTargetModelClass().findOne({
        where: this._generateWhereCondition()
      });
    }
  }, {
    key: 'delete',
    value: function _delete() {
      return this.getTargetModelClass().deleteOne({
        where: this._generateWhereCondition()
      });
    }
  }]);

  return BelongsTo;
})(Relation);

module.exports = BelongsTo;