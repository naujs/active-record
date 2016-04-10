'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Api = require('../Api'),
    helpers = require('./helpers'),
    Promise = require('@naujs/util').getPromise();

var ReadApi = (function (_Api) {
  _inherits(ReadApi, _Api);

  function ReadApi(cls) {
    var _this;

    _classCallCheck(this, ReadApi);

    return _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ReadApi).call(this, 'read', {
      path: helpers.generatePathWithPk(cls),
      method: 'GET',
      args: helpers.generateArgsWithPk(cls)
    }, function (args, ctx) {
      var primaryKey = cls.getPrimaryKey();
      return cls.findByPk(args[primaryKey]).then(function (result) {
        if (!result) {
          var error = new Error(_this.getModelName() + ' not found');
          error.httpCode = error.code = 404;
          return Promise.reject(error);
        }
        return result;
      }).catch(helpers.handleError);
    }));
  }

  return ReadApi;
})(Api);

module.exports = ReadApi;