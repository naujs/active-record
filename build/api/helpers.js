'use strict';

var path = require('path'),
    _ = require('lodash'),
    Promise = require('@naujs/util').getPromise();

module.exports = {
  generatePathWithPk: function generatePathWithPk(cls) {
    var pk = cls.getPrimaryKey();

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return path.join.apply(path, ['/:' + pk].concat(args));
  },

  generateArgsWithPk: function generateArgsWithPk(cls) {
    var extra = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var primaryKey = cls.getPrimaryKey();
    var primaryKeyType = cls.getPrimaryKeyType();

    var args = {};
    args[primaryKey] = {
      type: primaryKeyType,
      required: true
    };

    return _.extend(args, extra);
  },

  generateArgsFromProperties: function generateArgsFromProperties(cls) {
    var extra = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var properties = cls.getProperties();
    var args = {};

    _.each(properties, function (options, name) {
      if (options.persistable === false) return;

      if (_.isString(options)) {
        options = {
          type: options
        };
      }

      args[name] = options;
    });

    _.each(cls.getForeignKeys(), function (name) {
      args[name] = 'any';
    });

    return _.extend(args, extra);
  },

  handleError: function handleError(err) {
    if (err instanceof Error) {
      return Promise.reject(err);
    }

    var error = new Error(err);
    error.statusCode = error.code = 500;
    return Promise.reject(error);
  }
};