var Api = require('../Api')
  , helpers = require('./helpers')
  , path = require('path');

class FindRelationApi extends Api {
  constructor(cls, relationName) {
    super(`find__${relationName}`, {
      path: helpers.generatePathWithPk(cls, relationName),
      method: 'GET',
      args: helpers.generateArgsWithPk(cls, {
        filter: 'object'
      })
    }, (args, ctx) => {
      var primaryKey = cls.getPrimaryKey();
      return cls.findByPk(args[primaryKey]).then((result) => {
        if (!result) {
          let error = new Error(`${cls.getModelName()} not found`);
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }
        return result[relationName].find(args.filter || {});
      }).catch(helpers.handleError);
    });

    this.setModelClass(cls);
  }
}

module.exports = FindRelationApi;
