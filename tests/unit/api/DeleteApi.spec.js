var DeleteApi = require('../../../build/api/DeleteApi')
  , Promise = require('@naujs/util').getPromise();

describe('DeleteApi', () => {
  var api;

  beforeEach(() => {
    api = new DeleteApi(Store);

    spyOn(Store.prototype, 'delete').and.callFake(() => {
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
    Store.prototype.delete.and.callThrough();
    Store.findByPk.and.callThrough();
  });

  it('should call #delete', () => {
    return api.execute({
      id: 1
    }, {}).then((result) => {
      expect(Store.prototype.delete).toHaveBeenCalled();
      expect(Store.findByPk).toHaveBeenCalledWith(1);
    });
  });
});
