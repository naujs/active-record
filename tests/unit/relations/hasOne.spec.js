'use strict';

var HasOne = require('../../../build/relations/HasOne')
  , Promise = require('@naujs/util').getPromise();

function relationFunction(instance, relationName, value) {
  return new HasOne(instance, relationName, value).asFunction();
}

describe('HasOne', () => {
  var instance, connector;

  beforeEach(() => {
    spyOn(Alias, 'findOne');
    spyOn(Alias, 'deleteOne');

    instance = new Store({
      id: 1,
      name: 'Store 1',
      user_id: 1
    });
  });

  afterEach(() => {
    Alias.findOne.and.callThrough();
    Alias.deleteOne.and.callThrough();
  });

  it('should return values if provide', () => {
    var relation = relationFunction(instance, 'alias', {
      name: 'store-1',
      id: 1,
      store_id: 1
    });
    expect(relation() instanceof Alias).toBe(true);
  });

  it('should return function to find hasMany relation', () => {
    Alias.findOne.and.callFake(() => {
      return Promise.resolve([]);
    });

    var relation = relationFunction(instance, 'alias');
    return relation({
      where: {
        name: 'store-1'
      }
    }).then(() => {
      expect(Alias.findOne.calls.count()).toBe(1);
      var filter = Alias.findOne.calls.argsFor(0)[0];
      expect(filter).toEqual({
        where: {
          store_id: 1
        }
      });
    });
  });

  describe('#delete', () => {
    it('should delete the related model', () => {
      Alias.deleteOne.and.callFake(() => {
        return Promise.resolve({});
      });

      var relation = relationFunction(instance, 'alias');
      return relation.delete({
        where: {
          name: 'store-1'
        }
      }).then(() => {
        expect(Alias.deleteOne.calls.count()).toBe(1);
        var args = Alias.deleteOne.calls.argsFor(0);
        var filter = args[0];
        expect(filter).toEqual({
          where: {
            store_id: 1
          }
        });
      });
    });
  });
});
