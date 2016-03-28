'use strict';

var HasManyAndBelongsTo = require('../../../build/relations/HasManyAndBelongsTo')
  , Promise = require('@naujs/util').getPromise();

function relationFunction(instance, relation, value) {
  return new HasManyAndBelongsTo(instance, relation, value).asFunction();
}

describe('HasManyAndBelongsTo', () => {
  var instance, connector;

  beforeEach(() => {
    spyOn(Tag, 'findAll');
    spyOn(StoreTag, 'deleteAll');

    instance = new Store({
      id: 1,
      name: 'Store 1',
      user_id: 1
    });
  });

  afterEach(() => {
    Tag.findAll.and.callThrough();
    StoreTag.deleteAll.and.callThrough();
  });

  it('should return values if provide', () => {
    var relation = relationFunction(instance, Store.getRelations()['tags'], [
      {
        name: 'Tag1',
        id: 1
      },
      {
        name: 'Tag2',
        id: 2
      }
    ]);
    var values = relation();
    expect(values.length).toEqual(2);
    expect(values[0] instanceof Tag).toBe(true);
    expect(values[1] instanceof Tag).toBe(true);
  });

  it('should return function to find hasManyAndBelongsTo relation', () => {
    Tag.findAll.and.callFake(() => {
      return Promise.resolve([]);
    });

    var relation = relationFunction(instance, Store.getRelations()['tags']);
    return relation({
      limit: 10,
      where: {
        name: 'Tag1'
      }
    }).then((tags) => {
      expect(Tag.findAll.calls.count()).toBe(1);
      var filter = Tag.findAll.calls.argsFor(0)[0];
      expect(filter.where.name).toEqual('Tag1');
      expect(filter.limit).toEqual(10);

      var criteria = filter.where.id.in;
      expect(criteria.getWhere()).toEqual([
        {
          key: 'store_id',
          value: 1,
          operator: 'eq',
          or: false
        }
      ]);
      expect(criteria.getModelClass().getModelName()).toEqual('StoreTag');
    });
  });

  describe('#delete', () => {
    it('should delete all related models', () => {
      StoreTag.deleteAll.and.callFake(() => {
        return Promise.resolve({});
      });

      var relation = relationFunction(instance, Store.getRelations()['tags']);
      return relation.delete({
        where: {
          name: 'Tag1'
        },
        limit: 10
      }).then(() => {
        expect(StoreTag.deleteAll.calls.count()).toBe(1);
        var args = StoreTag.deleteAll.calls.argsFor(0);
        var filter = args[0];
        expect(filter.where.store_id).toEqual(1);
        var tagId = filter.where.tag_id.in;
        expect(tagId.getWhere()).toEqual([
          {
            key: 'name',
            value: 'Tag1',
            operator: 'eq',
            or: false
          }
        ]);
        expect(tagId.getLimit()).toEqual(10);
        expect(tagId.getFields()).toEqual(['id']);
      });
    });
  });
});
