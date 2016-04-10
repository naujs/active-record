var ReadApi = require('../../../build/api/ReadApi');

describe('ReadApi', () => {
  var api;

  beforeEach(() => {
    api = new ReadApi(Store);

    spyOn(Store, 'findByPk').and.callFake(() => {
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    Store.findByPk.and.callThrough();
  });

  it('should call .findByPk', () => {
    return api.execute({
      id: 1
    }, {}).then((result) => {
      expect(result).toEqual({});
      expect(Store.findByPk).toHaveBeenCalledWith(1);
    });
  });
});
