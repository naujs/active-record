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

module.exports = Api;
