'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var util = require('@naujs/util'),
    _ = require('lodash'),
    Promise = util.getPromise();

var Api = (function () {
  function Api(name, definition, handler) {
    _classCallCheck(this, Api);

    this._name = name;
    this._definition = definition;
    this.setHandler(handler);

    this._beforeHooks = [];
    this._afterHooks = [];
    this.enable();
  }

  _createClass(Api, [{
    key: 'getPath',
    value: function getPath() {
      return this._definition.path;
    }
  }, {
    key: 'getArgs',
    value: function getArgs() {
      return _.clone(this._definition.args) || {};
    }
  }, {
    key: 'getMethod',
    value: function getMethod() {
      return this._definition.method || this._definition.type;
    }
  }, {
    key: 'isEnabled',
    value: function isEnabled() {
      return this._enabled;
    }
  }, {
    key: 'disable',
    value: function disable() {
      this._enabled = false;
    }
  }, {
    key: 'enable',
    value: function enable() {
      this._enabled = true;
    }
  }, {
    key: 'getName',
    value: function getName() {
      return this._name;
    }
  }, {
    key: 'setHandler',
    value: function setHandler(fn) {
      this._handler = fn;
    }
  }, {
    key: 'getHandler',
    value: function getHandler() {
      return this._handler;
    }
  }, {
    key: 'setDefinition',
    value: function setDefinition(definition) {
      this._definition = definition;
    }
  }, {
    key: 'getDefinition',
    value: function getDefinition() {
      return this._definition;
    }
  }, {
    key: 'before',
    value: function before(fn) {
      this._beforeHooks.push(fn);
    }
  }, {
    key: 'after',
    value: function after(fn) {
      this._afterHooks.push(fn);
    }
  }, {
    key: '_runHooks',
    value: function _runHooks(hooks) {
      var _this = this;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var fn = hooks.shift();
      if (!fn) {
        return Promise.resolve(null);
      }

      return util.tryPromise(fn.apply(undefined, args)).then(function () {
        return _this._runHooks.apply(_this, [hooks].concat(args));
      }).then(function () {
        return _this;
      });
    }
  }, {
    key: 'execute',
    value: function execute(args, ctx) {
      var _this2 = this;

      if (!this._enabled) {
        var error = new Error('API ' + this.getName() + ' is disabled');
        error.httpCode = error.code = 400;
        return Promise.reject(error);
      }

      if (!this._handler || !_.isFunction(this._handler)) {
        var error = new Error('API ' + this.getName() + ' does not have a valid handler');
        error.httpCode = error.code = 500;
        return Promise.reject(error);
      }

      return this._runHooks(this._beforeHooks, args, ctx).then(function () {
        return _this2._handler(args, ctx);
      }).then(function (result) {
        return _this2._runHooks(_this2._afterHooks, result, args, ctx).then(function () {
          return result;
        });
      });
    }
  }]);

  return Api;
})();

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

      var api = this.getApi(name);

      if (api) {
        api.setHandler(handler.bind(this));
        api.setDefinition(definition);
      } else {
        api = new Api(name, definition, handler);
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

      _.each(this._defaultApi.concat(this._api), function (api) {
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