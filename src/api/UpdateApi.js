var Api = require('../Api')
  , helpers = require('./helpers')
  , Promise = require('@naujs/util').getPromise();

class UpdateApi extends Api {
  constructor(cls) {
    super('update', {
      path: helpers.generatePathWithPk(cls),
      method: 'PUT',
      args: helpers.generateArgsFromProperties(cls, helpers.generateArgsWithPk(cls))
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
        instance.setAttributes(args);
        return instance.save().then((result) => {
          if (!result) {
            let error = new Error('Validation failed');
            error.statusCode = error.code = 400;
            error.data = instance.getErrors();
            return Promise.reject(error);
          }
          return result;
        }).catch(helpers.handleError);
      });
    });
  }
}

module.exports = UpdateApi;
