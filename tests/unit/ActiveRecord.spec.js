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

      var expectedCriteria = new DbCriteria(Store, filter);
      expectedCriteria.limit(1);

      return Store.findOne(filter).then(() => {
        expect(connector.read).toHaveBeenCalledWith(expectedCriteria);
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

      return Store.findOne(filter).then((instance) => {
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

      return Store.findOne(filter).then(() => {
        expect(onAfterFind.calls.count()).toEqual(1);
        var args = onAfterFind.calls.argsFor(0);
        expect(args.length).toBe(1);
        var context = args[0];
        expect(context.instances.length).toBe(1);
        expect(context.instances[0] instanceof Store).toBe(true);
        expect(context.filter).toEqual(filter);
        expect(context.instances[0].getAttributes()).toEqual(data);
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
      return Store.findByPk(1, {
        where: {
          name: 'Test'
        },
        include: 'owner'
      }).then(() => {
        expect(Store.findOne).toHaveBeenCalledWith({
          where: {
            'id': 1
          },
          include: 'owner'
        });
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

      var expectedCriteria = new DbCriteria(Store, filter);

      return Store.findAll(filter).then(() => {
        expect(connector.read).toHaveBeenCalledWith(expectedCriteria);
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

      return Store.findAll(filter).then((instances) => {
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

      return Store.findAll({}).then(() => {
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

      var expectedCriteria = new DbCriteria(instance, {});

      expectedCriteria.setAttributes({
        name: 'Store 1'
      });

      return instance.create().then(() => {
        expect(connector.create).toHaveBeenCalledWith(expectedCriteria);
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

      return instance.create().then((instance) => {
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

      return instance.create().then(() => {
        expect(instance.validate).toHaveBeenCalled();
      });
    });

    it('should trigger beforeCreate hook', () => {
      var instance = new Store({
        name: 'Store 1'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      return instance.create().then(() => {
        expect(onBeforeCreate.calls.count()).toBe(1);
        var args = onBeforeCreate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
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

      return instance.create().then(() => {
        expect(onBeforeCreate.calls.count()).toBe(0);
      });
    });

    it('should trigger afterCreate hook', () => {
      var instance = new Store({
        name: 'Store 1'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      return instance.create().then(() => {
        expect(onAfterCreate.calls.count()).toBe(1);
        var args = onAfterCreate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
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

      var expectedCriteria = new DbCriteria(instance, {where: {id: 1}});

      expectedCriteria.setAttributes({
        id: 1,
        name: 'Store 1'
      });

      return instance.update().then(() => {
        expect(connector.update).toHaveBeenCalledWith(expectedCriteria);
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

      return instance.update().then((instance) => {
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

      return instance.update().then(() => {
        expect(instance.validate).toHaveBeenCalled();
      });
    });

    it('should trigger beforeUpdate hook', () => {
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

      return instance.update().then(() => {
        expect(onBeforeUpdate.calls.count()).toBe(1);
        var args = onBeforeUpdate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
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

      return instance.update().then(() => {
        expect(onBeforeUpdate.calls.count()).toBe(0);
      });
    });

    it('should trigger afterUpdate hook', () => {
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

      return instance.update().then(() => {
        expect(onAfterUpdate.calls.count()).toBe(1);
        var args = onAfterUpdate.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
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
      instance.setPrimaryKeyValue(1);

      return instance.save().then(() => {
        expect(instance.update).toHaveBeenCalled();
      });
    });

    it('should call #create if the model is new', () => {
      return instance.save().then(() => {
        expect(instance.create).toHaveBeenCalled();
      });
    });

    it('should trigger beforeSave hook', () => {
      return instance.save().then(() => {
        expect(onBeforeSave.calls.count()).toBe(1);
        var args = onBeforeSave.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
      });
    });

    it('should trigger afterSave hook', () => {
      return instance.save().then(() => {
        expect(onAfterSave.calls.count()).toBe(1);
        var args = onAfterSave.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
      });
    });

    it('should return false if validation fails', () => {
      var instance = new Store();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(false);
      });

      return instance.save().then((result) => {
        expect(result).toBe(false);
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

      var expectedCriteria = new DbCriteria(instance, {where: {id: 1}});

      return instance.delete().then(() => {
        expect(connector.delete).toHaveBeenCalledWith(expectedCriteria);
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

      return instance.delete().then(() => {
        expect(onBeforeDelete.calls.count()).toBe(1);
        var args = onBeforeDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual();
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

      return instance.delete().then(() => {
        expect(onAfterDelete.calls.count()).toBe(1);
        var args = onAfterDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          instance: instance
        });
        expect(args[1]).toEqual();
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

      var filter = {
        where: {
          name: 'Store'
        }
      };

      var expectedCriteria = new DbCriteria(Store, filter);

      return Store.deleteAll(filter).then((results) => {
        expect(results).toEqual(deleted);
        expect(connector.delete).toHaveBeenCalledWith(expectedCriteria);
      });
    });

    it('should trigger beforeDelete hook', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve(deleted);
      });

      var filter = {
        where: {
          test: 1
        }
      };

      return Store.deleteAll(filter).then((results) => {
        expect(results).toEqual(deleted);
        expect(onBeforeDelete.calls.count()).toBe(1);
        var args = onBeforeDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          filter: filter
        });
      });
    });

    it('should trigger afterDelete hook', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve(deleted);
      });

      var filter = {
        where: {
          test: 1
        }
      };

      return Store.deleteAll(filter).then(() => {
        expect(onAfterDelete.calls.count()).toBe(1);
        var args = onAfterDelete.calls.argsFor(0);
        expect(args[0]).toEqual({
          filter: filter,
          deleted: deleted
        });
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

  describe('API', () => {
    beforeEach(() => {
      Store.api('test', {
        path: '/',
        method: 'GET',
        args: {
          filter: 'object'
        }
      }, (args, ctx) => {
        return Store.findAll(args.filter);
      });

      spyOn(Store, 'findAll').and.callFake(() => {
        return Promise.resolve([]);
      });
    });

    afterEach(() => {
      Store.findAll.and.callThrough();
    });

    it('should call correct handler', () => {
      return Store.callApi('test', {
        filter: {
          where: {
            name: 'Store 1'
          }
        }
      }, {}).then(() => {
        expect(Store.findAll).toHaveBeenCalledWith({
          where: {
            name: 'Store 1'
          }
        });
      });
    });

    it('should have default api', () => {
      var api = Store.getAllApi();
      expect(api.length).toEqual(7);
    });

    it('should allow to disable default api', () => {
      Store.disableApi('list');

      var api = _.find(Store.getAllApi(), (api) => {
        return api.getName() === 'list';
      });

      expect(api.isEnabled()).toEqual(false);
    });
  });
});
