var Api = require('../Api')
  , helpers = require('./helpers');

class ListApi extends Api {
  constructor(cls) {
    super('list', {
      path: '/',
      method: 'GET',
      args: {
        filter: 'object'
      }
    }, (args, ctx) => {
      return cls.findAll(args.filter || {}).catch(helpers.handleError);
    });
  }
}

module.exports = ListApi;
