'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Api = require('../Api'),
    helpers = require('./helpers'),
    path = require('path');

var FindRelationApi = function (_Api) {
  _inherits(FindRelationApi, _Api);

  function FindRelationApi(cls, relationName) {
    _classCallCheck(this, FindRelationApi);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(FindRelationApi).call(this, 'find__' + relationName, {
      path: helpers.generatePathWithPk(cls, relationName),
      method: 'GET',
      args: helpers.generateArgsWithPk(cls, {
        filter: 'object'
      })
    }, function (args, ctx) {
      var primaryKey = cls.getPrimaryKey();
      return cls.findByPk(args[primaryKey]).then(function (result) {
        if (!result) {
          var error = new Error(cls.getModelName() + ' not found');
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }
        return result[relationName].find(args.filter || {});
      }).catch(helpers.handleError);
    }));

    _this.setModelClass(cls);
    return _this;
  }

  return FindRelationApi;
}(Api);

module.exports = FindRelationApi;