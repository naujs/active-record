'use strict';

var HasMany = require('../../../build/relations/HasMany')
  , Promise = require('@naujs/util').getPromise();

function relationFunction(instance, relationName, value) {
  return new HasMany(instance, relationName, value).asFunction();
}

describe('HasMany', () => {
  var instance, connector;

  beforeEach(() => {
    spyOn(Product, 'findAll');
    spyOn(Product, 'deleteAll');

    instance = new Store({
      id: 1,
      name: 'Store 1',
      user_id: 1
    });
  });

  afterEach(() => {
    Product.findAll.and.callThrough();
    Product.deleteAll.and.callThrough();
  });

  it('should return values if provide', () => {
    var relation = relationFunction(instance, 'products', [
      {
        name: 'Product 1',
        id: 1,
        store_id: 1
      },
      {
        name: 'Product 2',
        id: 2,
        store_id: 1
      }
    ]);

    var values = relation();
    expect(values.length).toEqual(2);
    expect(values[0] instanceof Product).toBe(true);
    expect(values[1] instanceof Product).toBe(true);
  });

  it('should return function to find hasMany relation', () => {
    Product.findAll.and.callFake(() => {
      return Promise.resolve([]);
    });

    var relation = relationFunction(instance, 'products');
    return relation({
      limit: 10,
      where: {
        name: 'Store 1'
      }
    }).then((products) => {
      expect(Product.findAll.calls.count()).toBe(1);
      var filter = Product.findAll.calls.argsFor(0)[0];
      expect(filter).toEqual({
        limit: 10,
        where: {
          store_id: 1,
          name: 'Store 1'
        }
      });
    });
  });

  describe('#delete', () => {
    it('should delete all related models', () => {
      Product.deleteAll.and.callFake(() => {
        return Promise.resolve({});
      });

      var relation = relationFunction(instance, 'products');
      return relation.delete({
        where: {
          name: 'Product 1'
        },
        limit: 2
      }).then(() => {
        expect(Product.deleteAll.calls.count()).toBe(1);
        var args = Product.deleteAll.calls.argsFor(0);
        var filter = args[0];
        expect(filter).toEqual({
          where: {
            store_id: 1,
            name: 'Product 1'
          },
          limit: 2
        });
      });
    });
  });
});
