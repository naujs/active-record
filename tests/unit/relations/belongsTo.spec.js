'use strict';

var BelongsTo = require('../../../build/relations/BelongsTo')
  , Promise = require('@naujs/util').getPromise();

function relationFunction(instance, relationName, value) {
  return new BelongsTo(instance, relationName, value).asFunction();
}

describe('BelongsTo', () => {
  var instance, connector, relation;

  beforeEach(() => {
    spyOn(User, 'findOne');

    instance = new Store({
      id: 1,
      name: 'Store 1',
      user_id: 1
    });

    relation = relationFunction(instance, 'owner');
  });

  afterEach(() => {
    User.findOne.and.callThrough();
  });

  it('should return values if provide', () => {
    relation = relationFunction(instance, 'owner', {});
    expect(relation() instanceof User).toBe(true);
  });

  it('should return function to find the related model', () => {
    User.findOne.and.callFake(() => {
      return Promise.resolve({});
    });

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

  describe('#create', () => {
    beforeEach(() => {
      spyOn(User.prototype, 'save').and.callFake(() => {
        return Promise.resolve(new User({
          id: 2,
          name: 'User 2'
        }));
      });

      spyOn(Store.prototype, 'save').and.callFake(() => {
        return Promise.resolve({});
      });

      return relation.create({
        name: 'User 2'
      });
    });

    afterEach(() => {
      User.prototype.save.and.callThrough();
      Store.prototype.save.and.callThrough();
    });

    it('should call #save on the related model', () => {
      expect(User.prototype.save.calls.count()).toEqual(1);
      expect(User.prototype.save.calls.first().object.getAttributes()).toEqual({
        name: 'User 2'
      });
    });

    it('should set foreignKey afterward', () => {
      expect(Store.prototype.save.calls.count()).toEqual(1);
      expect(Store.prototype.save.calls.first().object.getAttributes()).toEqual({
        id: 1,
        name: 'Store 1',
        user_id: 2
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
