'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Api = require('../Api'),
    helpers = require('./helpers'),
    Promise = require('@naujs/util').getPromise();

var CreateApi = (function (_Api) {
  _inherits(CreateApi, _Api);

  function CreateApi(cls) {
    _classCallCheck(this, CreateApi);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(CreateApi).call(this, 'create', {
      path: '/',
      method: 'POST',
      args: helpers.generateArgsFromProperties(cls)
    }, function (args, ctx) {
      var instance = new cls(args);
      return instance.save().then(function (result) {
        if (!result) {
          var error = new Error('Validation failed');
          error.httpCode = error.code = 400;
          error.data = instance.getErrors();
          return Promise.reject(error);
        }
        return result;
      }).catch(helpers.handleError);
    }));
  }

  return CreateApi;
})(Api);

module.exports = CreateApi;