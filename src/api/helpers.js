var path = require('path')
  , _ = require('lodash')
  , Promise = require('@naujs/util').getPromise();

module.exports = {
  generatePathWithPk: function(cls, ...args) {
    var pk = cls.getPrimaryKey();

    return path.join.apply(path, [`/:${pk}`].concat(args));
  },

  generateArgsWithPk: function(cls, extra = {}) {
    var primaryKey = cls.getPrimaryKey();
    var primaryKeyType = cls.getPrimaryKeyType();

    var args = {};
    args[primaryKey] = {
      type: primaryKeyType,
      required: true
    };

    return _.extend(args, extra);
  },

  generateArgsFromProperties: function(cls, extra = {}) {
    var properties = cls.getProperties();
    var args = {};

    _.each(properties, (options, name) => {
      args[name] = {
        type: options.type ? options.type.toJSON() : 'any',
        required: options.rules ? !!options.rules : false
      };
    });

    _.each(cls.getForeignKeys(), (name) => {
      args[name] = 'any';
    });

    return _.extend(args, extra);
  },

  handleError: function(err) {
    if (err instanceof Error) {
      return Promise.reject(err);
    }

    let error = new Error(err);
    error.statusCode = error.code = 500;
    return Promise.reject(error);
  }
};
