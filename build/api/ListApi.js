'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Api = require('../Api'),
    helpers = require('./helpers');

var ListApi = (function (_Api) {
  _inherits(ListApi, _Api);

  function ListApi(cls) {
    _classCallCheck(this, ListApi);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ListApi).call(this, 'list', {
      path: '/',
      method: 'GET',
      args: {
        filter: 'object'
      }
    }, function (args, ctx) {
      return cls.findAll(args.filter || {}).catch(helpers.handleError);
    }));
  }

  return ListApi;
})(Api);

module.exports = ListApi;