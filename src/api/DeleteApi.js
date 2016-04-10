var Api = require('../Api')
  , helpers = require('./helpers')
  , Promise = require('@naujs/util').getPromise();

class DeleteApi extends Api {
  constructor(cls) {
    super('delete', {
      path: helpers.generatePathWithPk(cls),
      method: 'DELETE',
      args: helpers.generateArgsWithPk(cls)
    }, (args, ctx) => {
      var pk = args[cls.getPrimaryKey()];
      // TODO: this is not ideal to do 2 queries here
      // Optimize it to do only one
      return cls.findByPk(pk).then((result) => {
        if (!result) {
          let error = new Error(`${cls.getModelName()} not found`);
          error.statusCode = error.code = 404;
          return Promise.reject(error);
        }
        return result;
      }).then((instance) => {
        return instance.delete();
      }).catch(helpers.handleError);
    });
  }
}

module.exports = DeleteApi;
