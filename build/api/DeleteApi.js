'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Api = require('../Api'),
    helpers = require('./helpers'),
    Promise = require('@naujs/util').getPromise();

var DeleteApi = (function (_Api) {
  _inherits(DeleteApi, _Api);

  function DeleteApi(cls) {
    _classCallCheck(this, DeleteApi);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DeleteApi).call(this, 'delete', {
      path: helpers.generatePathWithPk(cls),
      method: 'DELETE',
      args: helpers.generateArgsWithPk(cls)
    }, function (args, ctx) {
      var pk = args[cls.getPrimaryKey()];
      // TODO: this is not ideal to do 2 queries here
      // Optimize it to do only one
      return cls.findByPk(pk).then(function (result) {
        if (!result) {
          var error = new Error(cls.getModelName() + ' not found');
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }
        return result;
      }).then(function (instance) {
        return instance.delete();
      }).catch(helpers.handleError);
    }));

    _this.setModelClass(cls);
    return _this;
  }

  return DeleteApi;
})(Api);

module.exports = DeleteApi;