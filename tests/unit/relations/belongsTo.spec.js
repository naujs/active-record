'use strict';

var BelongsTo = require('../../../build/relations/BelongsTo')
  , Promise = require('@naujs/util').getPromise();

function relationFunction(instance, relation, value) {
  return new BelongsTo(instance, relation, value).asFunction();
}

describe('BelongsTo', () => {
  var instance, connector;

  beforeEach(() => {
    spyOn(User, 'findOne');

    instance = new Store({
      id: 1,
      name: 'Store 1',
      user_id: 1
    });
  });

  afterEach(() => {
    User.findOne.and.callThrough();
  });

  it('should return values if provide', () => {
    var relation = relationFunction(instance, Store.getRelations()['owner'], 1);
    expect(relation()).toEqual(1);
  });

  it('should return function to find the related model', () => {
    User.findOne.and.callFake(() => {
      return Promise.resolve({});
    });

    var relation = relationFunction(instance, Store.getRelations()['owner']);

    return relation().then((owner) => {
      expect(User.findOne.calls.count()).toBe(1);
      var filter = User.findOne.calls.argsFor(0)[0];
      expect(filter).toEqual({
        where: {
          id: 1
        }
      });
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      spyOn(User, 'deleteOne');
    });

    afterEach(() => {
      User.deleteOne.and.callThrough();
    });

    it('should deleted the target model', () => {
      User.deleteOne.and.callFake(() => {
        return Promise.resolve({});
      });

      var relation = relationFunction(instance, Store.getRelations()['owner'], 1);
      return relation.delete({
        where: {
          name: 'User 2'
        }
      }).then((result) => {
        expect(User.deleteOne.calls.count()).toBe(1);
        var args = User.deleteOne.calls.argsFor(0);
        var filter = args[0];
        expect(filter).toEqual({
          where: {
            id: 1
          }
        });
      });
    });
  });
});
