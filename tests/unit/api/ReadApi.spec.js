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
      id: 1,
      filter: {}
    }, {}).then((result) => {
      expect(result).toEqual({});
      expect(Store.findByPk).toHaveBeenCalledWith(1, {});
    });
  });

  it('should return error if not found', () => {
    Store.findByPk.and.callFake(() => {
      return Promise.resolve(null);
    });

    return api.execute({
      id: 1
    }).then(() => {
      fail('Should have error');
    }, (error) => {
      expect(error.statusCode).toEqual(404);
      expect(error.code).toEqual(404);
      expect(error.message).toEqual('Store not found');
    });
  });
});
