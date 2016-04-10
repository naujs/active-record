var UpdateApi = require('../../../build/api/UpdateApi')
  , Promise = require('@naujs/util').getPromise();

describe('UpdateApi', () => {
  var api;

  beforeEach(() => {
    api = new UpdateApi(Store);

    spyOn(Store.prototype, 'update').and.callFake(() => {
      return Promise.resolve({});
    });

    spyOn(Store, 'findByPk').and.callFake(() => {
      var store = new Store({
        id: 1,
        name: 'Store 1'
      });

      return Promise.resolve(store);
    });
  });

  afterEach(() => {
    Store.prototype.update.and.callThrough();
    Store.findByPk.and.callThrough();
  });

  it('should call #update', () => {
    return api.execute({
      id: 1,
      name: 'Test'
    }, {}).then((result) => {
      expect(result.name).toEqual('Test');
      expect(Store.prototype.update).toHaveBeenCalled();
      expect(Store.findByPk).toHaveBeenCalledWith(1);
    });
  });
});
