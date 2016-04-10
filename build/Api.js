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

module.exports = Api;