var util = require('@naujs/util')
  , _ = require('lodash')
  , Promise = util.getPromise();

class Api {
  constructor(name, definition, handler) {
    this._name = name;
    this._definition = definition;
    this.setHandler(handler);

    this._beforeHooks = [];
    this._afterHooks = [];
    this.enable();
  }

  getPath() {
    return this._definition.path;
  }

  getArgs() {
    if (!this._args) {
      var args = {};
      _.each(this._definition.args, (options, name) => {
        if (_.isString(options)) {
          args[name] = {};
          args[name].type = options;
        } else if (_.isObject(options)) {
          args[name] = options;
        }
      });
      this._args = args;
    }
    return this._args;
  }

  getMethod() {
    return this._definition.method || this._definition.type || 'get';
  }

  isEnabled() {
    return this._enabled;
  }

  disable() {
    this._enabled = false;
  }

  enable() {
    this._enabled = true;
  }

  getName() {
    return this._name;
  }

  setHandler(fn) {
    this._handler = fn;
  }

  getHandler() {
    return this._handler;
  }

  setDefinition(definition) {
    this._definition = definition;
    delete this._args;
  }

  getDefinition() {
    return this._definition;
  }

  before(fn) {
    this._beforeHooks.push(fn);
  }

  after(fn) {
    this._afterHooks.push(fn);
  }

  _runHooks(hooks, ...args) {
    var fn = hooks.shift();
    if (!fn) {
      return Promise.resolve(null);
    }

    return util.tryPromise(fn(...args)).then(() => {
      return this._runHooks(hooks, ...args);
    }).then(() => {
      return this;
    });
  }

  execute(args, ctx) {
    if (!this._enabled) {
      let error = new Error(`API ${this.getName()} is disabled`);
      error.httpCode = error.code = 400;
      return Promise.reject(error);
    }

    if (!this._handler || !_.isFunction(this._handler)) {
      let error = new Error(`API ${this.getName()} does not have a valid handler`);
      error.httpCode = error.code = 500;
      return Promise.reject(error);
    }

    return this._runHooks(this._beforeHooks, args, ctx).then(() => {
      return this._handler(args, ctx);
    }).then((result) => {
      return this._runHooks(this._afterHooks, result, args, ctx).then(() => {
        return result;
      });
    });
  }
}

/**
 * Build a mixin to allow any object to act as API
 * For now, only ActiveRecord uses this mixin
 */
Api.buildMixin = function(options = {}) {
  // A function returning an array of default API
  var defaultApi = options.defaultApi;
  // A function returning the name of this API
  var apiName = options.apiName;

  return {
    api: function(nameOrApi, definition, handler) {
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

    getApi: function(name) {
      return _.find(this._api, function(api) {
        return api.getName() === name;
      });
    },

    getApiOrUseDefault: function(name) {
      var api = this.getApi(name);

      if (!api) {
        api = this.getDefaultApi(name);
      }

      return api;
    },

    setupDefaultApi: function() {
      this._defaultApi = [];
      if (defaultApi) {
        this._defaultApi = this._defaultApi.concat(defaultApi.call(this));
      }
    },

    getDefaultApi: function(name) {
      if (!this._defaultApi) this.setupDefaultApi();

      return _.find(this._defaultApi, function(api) {
        return api.getName() === name;
      });
    },

    getAllApi: function() {
      var allApi = {};

      if (!this._defaultApi) this.setupDefaultApi();

      _.each((this._api || []).concat(this._defaultApi), (api) => {
        allApi[api.getName()] = api;
      });

      return _.values(allApi);
    },

    disableApi: function(name) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        return api.disable();
      }
    },

    setAccess: function(name, access) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        throw `API ${name} is not defined`;
      }

      var definition = api.getDefinition() || {};
      definition.access = access;
      api.setDefinition(definition);
    },

    handleApi: function(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        throw `API ${name} is not defined`;
      }

      api.setHandler(fn.bind(this));
    },

    callApi: function(name, args, ctx) {
      var api = this.getApiOrUseDefault(name);

      if (!api) {
        let error = new Error(`API "${name}" is not found`);
        error.httpCode = error.code = 500;
        return Promise.reject(error);
      }

      return api.execute(args, ctx);
    },

    getApiName: function() {
      if (!apiName) {
        throw 'Must have apiName';
      }

      return apiName.call(this);
    },

    beforeApi: function(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        api.before(fn);
      }
    },

    afterApi: function(name, fn) {
      var api = this.getApiOrUseDefault(name);

      if (api) {
        api.after(fn);
      }
    }
  };
};

module.exports = Api;
