'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Registry = require('@naujs/registry'),
    DbCriteria = require('@naujs/db-criteria'),
    _ = require('lodash'),
    HasMany = require('./HasMany');

var HasManyAndBelongsTo = (function (_HasMany) {
  _inherits(HasManyAndBelongsTo, _HasMany);

  function HasManyAndBelongsTo() {
    _classCallCheck(this, HasManyAndBelongsTo);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(HasManyAndBelongsTo).apply(this, arguments));
  }

  _createClass(HasManyAndBelongsTo, [{
    key: 'getThroughModelClass',
    value: function getThroughModelClass() {
      if (!this.ThroughModel) {
        this.ThroughModel = Registry.getModel(this.getRelation().through);
      }
      return this.ThroughModel;
    }
  }, {
    key: '_getTargetRelation',
    value: function _getTargetRelation() {
      var _this2 = this;

      if (!this._targetRelation) {
        (function () {
          var compare = _this2.getRelation().model;
          _this2._targetRelation = _.chain(_this2.getThroughModelClass().getRelations()).toPairs().map(function (pair) {
            if (pair[1].model === compare) {
              return pair[1];
            }
            return null;
          }).compact().first().value();
        })();
      }
      return this._targetRelation;
    }
  }, {
    key: 'find',
    value: function find() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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
  }, {
    key: 'delete',
    value: function _delete() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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
  }]);

  return HasManyAndBelongsTo;
})(HasMany);

module.exports = HasManyAndBelongsTo;