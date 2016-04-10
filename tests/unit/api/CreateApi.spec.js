var CreateApi = require('../../../build/api/CreateApi');

describe('CreateApi', () => {
  var api;

  beforeEach(() => {
    api = new CreateApi(Store);

    spyOn(Store.prototype, 'create').and.callFake(() => {
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    Store.prototype.create.and.callThrough();
  });

  it('should call #create', () => {
    return api.execute({
      name: 'Test'
    }, {}).then((result) => {
      expect(result.name).toEqual('Test');
      expect(Store.prototype.create).toHaveBeenCalled();
    });
  });
});
