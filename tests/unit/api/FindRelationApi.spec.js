var FindRelationApi = require('../../../build/api/FindRelationApi');

describe('FindRelationApi', () => {
  var api, store;

  beforeEach(() => {
    store = new Store({
      id: 1,
      name: 'Store 1'
    });

    spyOn(store.products, 'find').and.callFake(() => {
      return Promise.resolve([]);
    });

    spyOn(store.owner, 'find').and.callFake(() => {
      return Promise.resolve({});
    });

    spyOn(Store, 'findByPk').and.callFake(() => {
      return Promise.resolve(store);
    });
  });

  it('should call products.find', () => {
    api = new FindRelationApi(Store, 'products');

    return api.execute({
      id: 1,
      filter: {
        where: {
          name: 'Store 1'
        }
      }
    }, {}).then((result) => {
      expect(Store.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
      expect(store.products.find).toHaveBeenCalledWith({
        where: {
          name: 'Store 1'
        }
      });
    });
  });

  it('should call owner.find', () => {
    api = new FindRelationApi(Store, 'owner');

    return api.execute({
      id: 1,
      filter: {
        where: {
          name: 'Store 1'
        }
      }
    }, {}).then((result) => {
      expect(Store.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual({});
      expect(store.owner.find).toHaveBeenCalledWith({
        where: {
          name: 'Store 1'
        }
      });
    });
  });
});
