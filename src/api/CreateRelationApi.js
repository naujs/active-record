var Api = require('../Api')
  , helpers = require('./helpers')
  , path = require('path')
  , _ = require('lodash');

class CreateRelationApi extends Api {
  constructor(cls, relationName) {
    super(`create__${relationName}`, {
      path: helpers.generatePathWithPk(cls, relationName),
      method: 'POST',
      args: helpers.generateArgsFromProperties(cls.getRelations()[relationName].model)
    }, (args, ctx) => {
      var primaryKey = cls.getPrimaryKey();
      return cls.findByPk(args[primaryKey]).then((result) => {
        if (!result) {
          let error = new Error(`${cls.getModelName()} not found`);
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }
        args = _.clone(args);
        delete args[primaryKey];
        return result[relationName].create(args);
      }).catch(helpers.handleError);
    });

    this.setModelClass(cls);
  }
}

module.exports = CreateRelationApi;
