var ListApi = require('../../../build/api/ListApi');

describe('ListApi', () => {
  var api;

  beforeEach(() => {
    api = new ListApi(Store);

    spyOn(Store, 'findAll').and.callFake(() => {
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    Store.findAll.and.callThrough();
  });

  it('should call .findAll', () => {
    return api.execute({
      filter: {
        where: {
          name: 'Store 1'
        }
      }
    }, {}).then((result) => {
      expect(result).toEqual([]);
      expect(Store.findAll).toHaveBeenCalledWith({
        where: {
          name: 'Store 1'
        }
      });
    });
  });
});
