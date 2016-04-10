var Api = require('../Api')
  , helpers = require('./helpers');

class CountApi extends Api {
  constructor(cls) {
    super('count', {
      path: '/count',
      method: 'GET',
      args: {
        filter: 'object'
      }
    }, (args, ctx) => {
      return cls.count(args.filter || {}).catch(helpers.handleError);
    });
  }
}

module.exports = CountApi;
