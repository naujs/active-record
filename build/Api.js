'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var util = require('@naujs/util'),
    _ = require('lodash'),
    Promise = util.getPromise(),
    Route = require('@naujs/route');

var Api = function (_Route) {
  _inherits(Api, _Route);

  function Api() {
    _classCallCheck(this, Api);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Api).apply(this, arguments));
  }

  return Api;
}(Route);

/**
 * Build a mixin to allow any object to act as API
 * For now, only ActiveRecord uses this mixin
 */


Api.buildMixin = function () {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  // A function returning an array of default API
  var defaultApi = options.defaultApi;
  // A function returning the name of this API
  var apiName = options.apiName;

  return {
    api: function api(nameOrApi, definition, handler) {
      this._api = this._api || [];
      var name = nameOrApi;
      if (nameOrApi instanceof Api) {
        name = nameOrApi.getName();
        definition = nameOrApi.getDefinition();
        handler = nameOrApi.getHandler();
      }

      var api = this.getApiOrUseDefault(name);

      if (api) {
        if (handler) api.setHandler(handler.bind(this));
        api.setDefinition(definition);
      } else {
        api = new Api(name, definition, handler);
        api.setModelClass(this);
        this._api.push(api);
      }

      return api;
    },

    getApi: function getApi(name) {
      return _.find(this._api, function (api) {
        return api.getName() === name;
      });
    },

    getApiOrUseDefault: function getApiOrUseDefault(name) {
      var api = this.getApi(name);

      if (!api) {
        api = this.getDefaultApi(name);
      }

      return api;
    },

    setupDefaultApi: function setupDefaultApi() {
      this._defaultApi = [];
      if (defaultApi) {
        this._defaultApi = this._defaultApi.concat(defaultApi.call(this));
      }
    },

    getDefaultApi: function getDefaultApi(name) {
      if (!this._defaultApi) this.setupDefaultApi();

      return _.find(this._defaultApi, function (api) {
        return api.getName() === name;
      });
    },

    getAllApi: function getAllApi() {
      var allApi = {};

      if (!this._defaultApi) this.setupDefaultApi();

      _.each((this._api || []).concat(this._defaultApi), function (api) {
        allApi[api.getName()] = api;
      });

      return _.values(allApi);
    },

    disableApi: function disableApi(name) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        return api.disable();
      }
    },

    setAccess: function setAccess(name, access) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        throw 'API ' + name + ' is not defined';
      }

      var definition = api.getDefinition() || {};
      definition.access = access;
      api.setDefinition(definition);
    },

    handleApi: function handleApi(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        throw 'API ' + name + ' is not defined';
      }

      api.setHandler(fn.bind(this));
    },

    callApi: function callApi(name, args, ctx) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        var error = new Error('API "' + name + '" is not found');
        error.httpCode = error.code = 500;
        return Promise.reject(error);
      }

      return api.execute(args, ctx);
    },

    getApiName: function getApiName() {
      if (!apiName) {
        throw 'Must have apiName';
      }

      return apiName.call(this);
    },

    beforeApi: function beforeApi(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        api.before(fn);
      }
    },

    afterApi: function afterApi(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        api.after(fn);
      }
    }
  };
};

module.exports = Api;