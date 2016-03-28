/*eslint max-nested-callbacks:0*/

'use strict';
var ActiveRecord = require('../../');

var _ = require('lodash');

var Registry = require('@naujs/registry')
  , DbCriteria = require('@naujs/db-criteria');

class DummyConnector {}

describe('ActiveRecord', () => {
  var model, connector, onAfterFind;

  beforeEach(() => {
    DummyConnector.prototype.create = jasmine.createSpy('create');
    DummyConnector.prototype.read = jasmine.createSpy('read');
    DummyConnector.prototype.update = jasmine.createSpy('update');
    DummyConnector.prototype.delete = jasmine.createSpy('delete');

    connector = new DummyConnector();
    Registry.getInstance().set('ActiveRecord.connector', connector);

    onAfterFind = jasmine.createSpy('onAfterFind');

    Store.watch('afterFind', onAfterFind);

    model = new Store({
      name: 'Store 1',
      displayName: 'Store #1'
    });
  });

  afterEach(() => {
    Store.clearHooks();
  });

  describe('#getPersistableAttributes', () => {
    it('should return all persistable attributes', () => {
      expect(model.getPersistableAttributes()).toEqual({
        name: 'Store 1'
      });
    });
  });

  describe('#setAttributes', () => {
    it('should set id using the default attributes', () => {
      model.setAttributes({
        id: 1,
        name: 'Store 2'
      });

      expect(model.id).toEqual(1);
      expect(model.name).toEqual('Store 2');
    });

    it('should set id defined by the user', () => {
      Store.primaryKey = 'code';
      model.setAttributes({
        code: '123',
        name: 'Store 2'
      });

      expect(model.code).toEqual('123');
      expect(model.id).not.toBeDefined();
      expect(model.name).toEqual('Store 2');
    });

    afterEach(() => {
      Store.primaryKey = 'id';
    });
  });

  describe('#isNew', () => {
    it('should return true when the model is new', () => {
      model.setAttributes({
        name: 'Store 2'
      });

      expect(model.isNew()).toBe(true);
    });

    it('should return false when the model is not new', () => {
      model.setAttributes({
        id: 1,
        name: 'Store 2'
      });

      expect(model.isNew()).toBe(false);
    });
  });

  describe('.findOne', () => {
    it('should call #read on the connector', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([]);
      });

      var filter = {
        where: {name: 'Store 1'}
      };

      var options = {
        random: 'stuff'
      };

      var expectedCriteria = new DbCriteria(Store, filter, options);
      expectedCriteria.limit(1);

      return Store.findOne(filter, options).then(() => {
        expect(connector.read).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should populate the model with the result', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([{
          id: 1,
          name: 'Store 1'
        }]);
      });

      var filter = {
        where: {name: 'Store 1'}
      };

      var options = {
        random: 'stuff'
      };

      return Store.findOne(filter, options).then((instance) => {
        expect(instance instanceof Store).toBe(true);
        expect(instance.id).toEqual(1);
        expect(instance.name).toEqual('Store 1');
      });
    });

    it('should trigger afterFind hook when found the instance', () => {
      var data = {
        id: 1,
        name: 'Store 1'
      };

      connector.read.and.callFake(() => {
        return Promise.resolve([data]);
      });

      var filter = {
        where: {
          name: 'Store 1'
        }
      };

      var options = {
        random: 'stuff'
      };

      return Store.findOne(filter, options).then(() => {
        expect(onAfterFind.calls.count()).toEqual(1);
        var args = onAfterFind.calls.argsFor(0);
        expect(args.length).toBe(2);
        var context = args[0];
        expect(context.instances.length).toBe(1);
        expect(context.instances[0] instanceof Store).toBe(true);
        expect(context.filter).toEqual(filter);
        expect(context.instances[0].getAttributes()).toEqual(data);
        expect(args[1]).toEqual(options);
      });
    });

  });

  describe('.findByPk', () => {
    beforeEach(() => {
      spyOn(Store, 'findOne').and.callFake(() => {
        return Promise.resolve({});
      });
    });

    it('should call #findOne with correct filter', () => {
      var options = {
        random: 'stuff'
      };

      return Store.findByPk(1, options).then(() => {
        expect(Store.findOne).toHaveBeenCalledWith({
          where: {
            'id': 1
          }
        }, options);
      });
    });

    afterEach(() => {
      Store.findOne.and.callThrough();
    });
  });

  describe('.findAll', () => {
    it('should call #read on the connector', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([
          {
            id: 1,
            name: 'Store 1'
          },
          {
            id: 2,
            name: 'Store 2'
          }
        ]);
      });

      var filter = {
        where: {user_id: 1}
      };

      var options = {
        random: 'stuff'
      };

      var expectedCriteria = new DbCriteria(Store, filter, options);

      return Store.findAll(filter, options).then(() => {
        expect(connector.read).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should populate the model with the result', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([
          {
            id: 1,
            name: 'Store 1'
          },
          {
            id: 2,
            name: 'Store 2'
          }
        ]);
      });

      var filter = {
        where: {user_id: 1}
      };

      var options = {
        random: 'stuff'
      };

      return Store.findAll(filter, options).then((instances) => {
        _.each(instances, (instance, index) => { //eslint-disable-line max-nested-callbacks
          expect(instance instanceof Store).toBe(true);
          expect(instance.id).toEqual(index + 1);
          expect(instance.name).toEqual(`Store ${index + 1}`);
        });
      });
    });

    it('should trigger afterFind only once', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([
          {
            id: 1,
            name: 'Store 1'
          },
          {
            id: 2,
            name: 'Store 2'
          }
        ]);
      });

      var options = {
        random: 'stuff'
      };

      return Store.findAll({}, options).then(() => {
        expect(onAfterFind.calls.count()).toEqual(1);
        var args = onAfterFind.calls.argsFor(0);
        var context = args[0];
        expect(context.instances.length).toBe(2);
        expect(context.instances[0] instanceof Store).toBe(true);
        expect(context.instances[1] instanceof Store).toBe(true);
      });
    });

  });

  describe('#create', () => {
    var onBeforeCreate, onAfterCreate;
    beforeEach(() => {
      onBeforeCreate = jasmine.createSpy('onBeforeCreate');
      onAfterCreate = jasmine.createSpy('onAfterCreate');
      Store.watch('beforeCreate', onBeforeCreate);
      Store.watch('afterCreate', onAfterCreate);
    });

    it('should call #create on the connector', () => {
      var instance = new Store({
        name: 'Store 1',
        displayName: 'Store #1'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      var expectedCriteria = new DbCriteria(instance, {}, options);

      expectedCriteria.setAttributes({
        name: 'Store 1'
      });

      return instance.create(options).then(() => {
        expect(connector.create).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should reject if the model is not new', () => {
      var instance = new Store({
        id: 1,
        name: 'Store 1'
      });

      return instance.create().then(() => {
        throw 'Must reject';
      }, () => {

      });
    });

    it('should set attributes for the model afterward', () => {
      var instance = new Store({
        name: 'Store 1'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then((instance) => {
        expect(instance instanceof Store).toBe(true);
        expect(instance.id).toEqual(1);
      });
    });

    it('should call #validate on the model', () => {
      var instance = new Store();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(instance.validate).toHaveBeenCalledWith(options);
      });
    });

    it('should trigger beforeCreate hook', () => {
      var instance = new Store({
        name: 'Store 1'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(onBeforeCreate.calls.count()).toBe(1);
        var args = onBeforeCreate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });

    it('should not trigger beforeCreate hook if validation fails', () => {
      var instance = new Store();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(false);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(onBeforeCreate.calls.count()).toBe(0);
      });
    });

    it('should trigger afterCreate hook', () => {
      var instance = new Store();

      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(onAfterCreate.calls.count()).toBe(1);
        var args = onAfterCreate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });
  });

  describe('#update', () => {
    var onBeforeUpdate, onAfterUpdate;
    beforeEach(() => {
      onBeforeUpdate = jasmine.createSpy('onBeforeUpdate');
      onAfterUpdate = jasmine.createSpy('onAfterUpdate');
      Store.watch('beforeUpdate', onBeforeUpdate);
      Store.watch('afterUpdate', onAfterUpdate);
    });

    it('should call #update on the connector', () => {
      var instance = new Store({
        id: 1,
        name: 'Store 1'
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      var expectedCriteria = new DbCriteria(instance, {where: {id: 1}}, options);

      expectedCriteria.setAttributes({
        id: 1,
        name: 'Store 1'
      });

      return instance.update(options).then(() => {
        expect(connector.update).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should reject if the model is new', () => {
      var instance = new Store({
        name: 'Store 1'
      });

      return instance.update().then(() => {
        throw 'Must reject';
      }, () => {

      });
    });

    it('should set attributes for the model afterward', () => {
      var instance = new Store({
        id: 1,
        name: 'Store 1'
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 2'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then((instance) => {
        expect(instance instanceof Store).toBe(true);
        expect(instance.id).toEqual(1);
        expect(instance.name).toEqual('Store 2');
      });
    });

    it('should call #validate on the model', () => {
      var instance = new Store({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(instance.validate).toHaveBeenCalledWith(options);
      });
    });

    it('should trigger beforeUpdate hook', () => {
      var instance = new Store({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(onBeforeUpdate.calls.count()).toBe(1);
        var args = onBeforeUpdate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });

    it('should not trigger beforeUpdate hook if validation fails', () => {
      var instance = new Store({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(false);
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(onBeforeUpdate.calls.count()).toBe(0);
      });
    });

    it('should trigger afterUpdate hook', () => {
      var instance = new Store({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(onAfterUpdate.calls.count()).toBe(1);
        var args = onAfterUpdate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });
  });

  describe('#save', () => {
    var instance, onBeforeSave, onAfterSave;
    beforeEach(() => {
      instance = new Store({
        name: 'Store 1'
      });

      spyOn(instance, 'update').and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'create').and.callFake(() => {
        return Promise.resolve(instance);
      });

      onBeforeSave = jasmine.createSpy('onBeforeSave');
      onAfterSave = jasmine.createSpy('onAfterSave');

      Store.watch('beforeSave', onBeforeSave);
      Store.watch('afterSave', onAfterSave);
    });

    it('should call #update if the model is not new', () => {
      var options = {
        'random': 'stuff'
      };

      instance.setPrimaryKeyValue(1);

      return instance.save(options).then(() => {
        expect(instance.update).toHaveBeenCalledWith(options);
      });
    });

    it('should call #create if the model is new', () => {
      var options = {
        'random': 'stuff'
      };

      return instance.save(options).then(() => {
        expect(instance.create).toHaveBeenCalledWith(options);
      });
    });

    it('should trigger beforeSave hook', () => {
      var options = {
        'random': 'stuff'
      };

      return instance.save(options).then(() => {
        expect(onBeforeSave.calls.count()).toBe(1);
        var args = onBeforeSave.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });

    it('should trigger afterSave hook', () => {
      var options = {
        'random': 'stuff'
      };

      return instance.save(options).then(() => {
        expect(onAfterSave.calls.count()).toBe(1);
        var args = onAfterSave.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });
  });

  describe('#delete', () => {
    var onBeforeDelete, onAfterDelete;
    beforeEach(() => {
      onBeforeDelete = jasmine.createSpy('onBeforeDelete');
      onAfterDelete = jasmine.createSpy('onAfterDelete');

      Store.watch('beforeDelete', onBeforeDelete);
      Store.watch('afterDelete', onAfterDelete);
    });

    it('should call #delete on the connector', () => {
      var instance = new Store({
        id: 1
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      var expectedCriteria = new DbCriteria(instance, {where: {id: 1}}, options);

      return instance.delete(options).then(() => {
        expect(connector.delete).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should trigger beforeDelete hook', () => {
      var instance = new Store({
        id: 1
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.delete(options).then(() => {
        expect(onBeforeDelete.calls.count()).toBe(1);
        var args = onBeforeDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });

    it('should trigger afterDelete hook', () => {
      var instance = new Store({
        id: 1
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          name: 'Store 1'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.delete(options).then(() => {
        expect(onAfterDelete.calls.count()).toBe(1);
        var args = onAfterDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual(options);
      });
    });
  });

  describe('.deleteAll', () => {
    var onBeforeDelete, onAfterDelete, deleted;
    beforeEach(() => {
      onBeforeDelete = jasmine.createSpy('onBeforeDelete');
      onAfterDelete = jasmine.createSpy('onAfterDelete');

      Store.watch('beforeDelete', onBeforeDelete);
      Store.watch('afterDelete', onAfterDelete);

      deleted = [
        {
          id: 1,
          name: 'Store 1'
        },
        {
          id: 2,
          name: 'Store 2'
        }
      ];
    });

    it('should call #delete on the connector', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve(deleted);
      });

      var options = {
        random: 'stuff'
      };

      var filter = {
        where: {
          name: 'Store'
        }
      };

      var expectedCriteria = new DbCriteria(Store, filter, options);

      return Store.deleteAll(filter, options).then((results) => {
        expect(results).toEqual(deleted);
        expect(connector.delete).toHaveBeenCalledWith(expectedCriteria, options);
      });
    });

    it('should trigger beforeDelete hook', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve(deleted);
      });

      var options = {
        random: 'stuff'
      };

      var filter = {
        where: {
          test: 1
        }
      };

      return Store.deleteAll(filter, options).then((results) => {
        expect(results).toEqual(deleted);
        expect(onBeforeDelete.calls.count()).toBe(1);
        var args = onBeforeDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          filter: filter
        });
        expect(args[1]).toEqual(options);
      });
    });

    it('should trigger afterDelete hook', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve(deleted);
      });

      var options = {
        random: 'stuff'
      };

      var filter = {
        where: {
          test: 1
        }
      };

      return Store.deleteAll(filter, options).then(() => {
        expect(onAfterDelete.calls.count()).toBe(1);
        var args = onAfterDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          filter: filter,
          deleted: deleted
        });
        expect(args[1]).toEqual(options);
      });
    });
  });

  describe('.getAllProperties', () => {
    it('should return all properties including primary key and foreign keys', () => {
      expect(Store.getAllProperties()).toEqual(['name', 'id', 'user_id']);
    });
  });

  describe('Relation', () => {
    it('should define functions for interacting with relations', () => {
      _.each(Store.getRelations(), (relation, name) => {
        expect(typeof model[name]).toEqual('function');
      });
    });
  });

  // describe('.getDefaultEndPoints', () => {
  //   it('should construct default end points using the defined primary key', () => {
  //     expect(Dummy.getDefaultEndPoints()).toEqual(DEFAULT_ENDPOINTS);
  //   });
  // });
  //
  // describe('#getEndPoints', () => {
  //   afterEach(() => {
  //     delete Dummy.endPoints;
  //   });
  //
  //   it('should merge user-defined end points and default end points', () => {
  //     Dummy.endPoints = {
  //       'test': {
  //         path: 'test',
  //         type: 'GET'
  //       }
  //     };
  //
  //     expect(Dummy.getEndPoints()).toEqual(_.extend({
  //       'test': {
  //         path: 'test',
  //         type: 'GET'
  //       }
  //     }, DEFAULT_ENDPOINTS));
  //   });
  // });
  //
  // describe('.executeApi', () => {
  //   beforeEach(() => {
  //     DEFAULT_API_HANDLERS.forEach((method) => {
  //       spyOn(Dummy, method).and.callFake(function() {
  //         return Promise.resolve({});
  //       });
  //     });
  //   });
  //
  //   afterEach(() => {
  //     DEFAULT_API_HANDLERS.forEach((method) => {
  //       Dummy[method].calls.reset();
  //       Dummy[method].and.callThrough();
  //     });
  //   });
  //
  //   it('should call method with correct arguments', () => {
  //     return Dummy.executeApi('list', {where: {test: 'test'}}).then(() => {
  //       expect(Dummy.list.calls.count()).toEqual(1);
  //       expect(Dummy.list).toHaveBeenCalledWith({
  //         where: {
  //           test: 'test'
  //         }
  //       }, undefined);
  //     });
  //   });
  //
  //   DEFAULT_API_HANDLERS.forEach((method) => {
  //     it(`should call #${method} on data mapper`, () => {
  //       return Dummy.executeApi(method).then(() => {
  //         expect(Dummy[method]).toHaveBeenCalled();
  //       });
  //     });
  //   });
  //
  //   it('should return error when the method is not found', () => {
  //     return Dummy.executeApi('invalid').then(function() {
  //       throw 'Should not succeed';
  //     }, (error) => {
  //       expect(error.code).toEqual(500);
  //       expect(error.httpCode).toEqual(500);
  //     });
  //   });
  // });
  //
  // describe('.beforeApi', () => {
  //   var before0, before1, calls;
  //
  //   beforeEach(() => {
  //     Dummy.clearBeforeApiHooks();
  //
  //     before0 = jasmine.createSpy();
  //     before1 = jasmine.createSpy();
  //     calls = [];
  //     Dummy.beforeApi('list', before0);
  //     Dummy.beforeApi('list', before1);
  //
  //     spyOn(Dummy, 'list').and.callFake(() => {
  //       return Promise.resolve([]);
  //     });
  //   });
  //
  //   afterEach(() => {
  //     Dummy.list.calls.reset();
  //     Dummy.list.and.callThrough();
  //   });
  //
  //   it('should call before hooks before calling the method', () => {
  //     before0.and.callFake(() => {
  //       calls.push(0);
  //       return Promise.resolve(true);
  //     });
  //
  //     before1.and.callFake(() => {
  //       calls.push(1);
  //       return Promise.resolve(true);
  //     });
  //
  //     Dummy.list.and.callFake(() => {
  //       calls.push(2);
  //       return Promise.resolve({});
  //     });
  //
  //     return Dummy.executeApi('list', {test: 'test'}).then(() => {
  //       expect(calls).toEqual([0, 1, 2]);
  //       expect(before0).toHaveBeenCalledWith({test: 'test'}, undefined);
  //       expect(before1).toHaveBeenCalledWith({test: 'test'}, undefined);
  //     });
  //   });
  //
  //   it('should not call the method when any of the before hooks return error', () => {
  //     before0.and.callFake(() => {
  //       calls.push(0);
  //       let error = new Error();
  //       error.code = 400;
  //       return Promise.reject(error);
  //     });
  //
  //     before1.and.callFake(() => {
  //       calls.push(1);
  //       return Promise.resolve(true);
  //     });
  //
  //     Dummy.list.and.callFake(() => {
  //       calls.push(2);
  //       return Promise.resolve({});
  //     });
  //
  //     return Dummy.executeApi('list', {test: 'test'}).then(fail, (error) => {
  //       expect(calls).toEqual([0]);
  //       expect(error.code).toEqual(400);
  //     });
  //   });
  //
  // });
  //
  // describe('.afterApi', () => {
  //   var after0, after1, calls;
  //
  //   beforeEach(() => {
  //     Dummy.clearAfterApiHooks();
  //
  //     after0 = jasmine.createSpy();
  //     after1 = jasmine.createSpy();
  //     calls = [];
  //     Dummy.afterApi('list', after0);
  //     Dummy.afterApi('list', after1);
  //
  //     spyOn(Dummy, 'list').and.callFake(() => {
  //       return Promise.resolve([]);
  //     });
  //   });
  //
  //   afterEach(() => {
  //     Dummy.list.calls.reset();
  //     Dummy.list.and.callThrough();
  //   });
  //
  //   it('should call after hooks after calling the method', () => {
  //     after0.and.callFake(() => {
  //       calls.push(0);
  //       return Promise.resolve(true);
  //     });
  //
  //     after1.and.callFake(() => {
  //       calls.push(1);
  //       return Promise.resolve(true);
  //     });
  //
  //     Dummy.list.and.callFake(() => {
  //       calls.push(2);
  //       return Promise.resolve(3);
  //     });
  //
  //     return Dummy.executeApi('list', {test: 'test'}).then(() => {
  //       expect(calls).toEqual([2, 0, 1]);
  //       expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
  //       expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
  //     });
  //   });
  //
  //   it('should ignore error during the execution of after hooks', () => {
  //     after0.and.callFake(() => {
  //       calls.push(0);
  //       let error = new Error();
  //       error.code = 400;
  //       return Promise.reject(error);
  //     });
  //
  //     after1.and.callFake(() => {
  //       calls.push(1);
  //       return Promise.resolve(true);
  //     });
  //
  //     Dummy.list.and.callFake(() => {
  //       calls.push(2);
  //       return Promise.resolve(3);
  //     });
  //
  //     return Dummy.executeApi('list', {test: 'test'}).then(() => {
  //       expect(calls).toEqual([2, 0, 1]);
  //       expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
  //       expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
  //     });
  //   });
  // });

});
