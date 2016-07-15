var util = require('@naujs/util')
  , _ = require('lodash')
  , Promise = util.getPromise()
  , Route = require('@naujs/route');

class Api extends Route {}

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
