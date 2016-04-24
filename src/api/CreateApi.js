var Api = require('../Api')
  , helpers = require('./helpers')
  , Promise = require('@naujs/util').getPromise();

class CreateApi extends Api {
  constructor(cls) {
    super('create', {
      path: '/',
      method: 'POST',
      args: helpers.generateArgsFromProperties(cls)
    }, (args, ctx) => {
      var instance = new cls(args);
      return instance.save().then((result) => {
        if (!result) {
          let error = new Error('Validation failed');
          error.httpCode = error.code = 400;
          error.data = instance.getErrors();
          return Promise.reject(error);
        }
        return result;
      }).catch(helpers.handleError);
    });

    this.setModelClass(cls);
  }
}

module.exports = CreateApi;
