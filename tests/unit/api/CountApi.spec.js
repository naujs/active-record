var CountApi = require('../../../build/api/CountApi');

describe('CountApi', () => {
  var api;

  beforeEach(() => {
    api = new CountApi(Store);

    spyOn(Store, 'count').and.callFake(() => {
      return Promise.resolve(1);
    });
  });

  afterEach(() => {
    Store.count.and.callThrough();
  });

  it('should call .count', () => {
    return api.execute({
      filter: {
        where: {
          name: 'Store 1'
        }
      }
    }, {}).then((result) => {
      expect(result).toEqual(1);
      expect(Store.count).toHaveBeenCalledWith({
        where: {
          name: 'Store 1'
        }
      });
    });
  });
});
