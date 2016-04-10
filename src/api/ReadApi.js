var Api = require('../Api')
  , helpers = require('./helpers')
  , Promise = require('@naujs/util').getPromise();

class ReadApi extends Api {
  constructor(cls) {
    super('read', {
      path: helpers.generatePathWithPk(cls),
      method: 'GET',
      args: helpers.generateArgsWithPk(cls, {
        filter: 'object'
      })
    }, (args, ctx) => {
      var primaryKey = cls.getPrimaryKey();
      return cls.findByPk(args[primaryKey], args.filter).then((result) => {
        if (!result) {
          let error = new Error(`${cls.getModelName()} not found`);
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }

        return result;
      }).catch(helpers.handleError);
    });
  }
}

module.exports = ReadApi;
