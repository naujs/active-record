/*eslint max-nested-callbacks:0*/

'use strict';
var ActiveRecord = require('../');

var _ = require('lodash');

class DummyConnector {}
DummyConnector.prototype.create = jasmine.createSpy('create');
DummyConnector.prototype.read = jasmine.createSpy('read');
DummyConnector.prototype.update = jasmine.createSpy('update');
DummyConnector.prototype.delete = jasmine.createSpy('delete');

class Dummy extends ActiveRecord {

}

Dummy.properties = {
  firstName: {
    type: ActiveRecord.Types.string
  },
  lastName: {
    type: ActiveRecord.Types.string
  },
  name: {
    type: ActiveRecord.Types.string,
    persistable: false
  }
};

Dummy.modelName = 'dummy';

var expectedOptions = {
  'random': 'stuff',
  'primaryKey': 'id',
  'primaryKeyValue': undefined,
  'primaryKeyType': 'number',
  'properties': {
    'firstName': {
      'type': 'string'
    },
    'lastName': {
      'type': 'string'
    },
    'name': {
      'type': 'string',
      'persistable': false
    }
  },
  'modelName': 'dummy',
  'pluralName': 'dummies'
};

function extendExpectedOptions(params) {
  return _.extend({}, expectedOptions, params);
}

const DEFAULT_ENDPOINTS = {
  'list': {
    'path': '/',
    'type': 'GET',
    'args': {
      'where': 'object',
      'include': 'any',
      'field': ['string'],
      'order': ['string'],
      'limit': 'number',
      'offset': 'number'
    }
  },
  'find': {
    'path': '/:id',
    'type': 'GET',
    'args': {
      'id': {
        'type': 'number',
        'required': true
      }
    }
  },
  'create': {
    'path': '/',
    'type': 'POST'
  },
  'update': {
    'path': '/:id',
    'type': 'PUT',
    'args': {
      'id': {
        'type': 'number',
        'required': true
      }
    }
  },
  'delete': {
    'path': '/:id',
    'type': 'DELETE',
    'args': {
      'id': {
        'type': 'number',
        'required': true
      }
    }
  }
};

const DEFAULT_API_HANDLERS = _.keys(DEFAULT_ENDPOINTS);

describe('ActiveRecord', () => {
  var model, connector;

  beforeEach(() => {
    connector = new DummyConnector();
    Dummy.connector = connector;
    spyOn(Dummy.prototype, 'onAfterFind').and.callThrough();

    model = new Dummy({
      firstName: 'Tan',
      lastName: 'Nguyen',
      name: 'Tan Nguyen'
    });
  });

  afterEach(() => {
    Dummy.prototype.onAfterFind.calls.reset();
  });

  describe('#getPersistableAttributes', () => {
    it('should return all persistable attributes', () => {
      expect(model.getPersistableAttributes()).toEqual({
        firstName: 'Tan',
        lastName: 'Nguyen'
      });
    });
  });

  describe('#setAttributes', () => {
    it('should set id using the default attributes', () => {
      model.setAttributes({
        id: 1,
        firstName: 'Tan'
      });

      expect(model.id).toEqual(1);
      expect(model.firstName).toEqual('Tan');
    });

    it('should set id defined by the user', () => {
      Dummy.primaryKey = 'ssn';
      model.setAttributes({
        ssn: 1,
        firstName: 'Tan'
      });

      expect(model.ssn).toEqual(1);
      expect(model.id).not.toBeDefined();
      expect(model.firstName).toEqual('Tan');
    });

    afterEach(() => {
      Dummy.primaryKey = 'id';
    });
  });

  describe('#isNew', () => {
    it('should return true when the model is new', () => {
      model.setAttributes({
        firstName: 'Tan'
      });

      expect(model.isNew()).toBe(true);
    });

    it('should return false when the model is not new', () => {
      model.setAttributes({
        id: 1,
        firstName: 'Tan'
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
        where: {a: '1'}
      };

      var options = {
        random: 'stuff'
      };

      return Dummy.findOne(filter, options).then(() => {
        expect(connector.read).toHaveBeenCalledWith({
          where: {
            a: '1'
          },
          limit: 1
        }, expectedOptions);
      });
    });

    it('should populate the model with the result', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([{
          id: 1,
          firstName: 'Tan',
          lastName: 'Nguyen'
        }]);
      });

      var filter = {
        where: {a: '1'}
      };

      var options = {
        random: 'stuff'
      };

      return Dummy.findOne(filter, options).then((instance) => {
        expect(instance instanceof Dummy).toBe(true);
        expect(instance.id).toEqual(1);
        expect(instance.firstName).toEqual('Tan');
        expect(instance.lastName).toEqual('Nguyen');
      });
    });

    it('should call #onAfterFind when found the instance', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([{
          id: 1,
          firstName: 'Tan',
          lastName: 'Nguyen'
        }]);
      });

      var options = {
        random: 'stuff'
      };

      return Dummy.findOne({}, options).then(() => {
        expect(Dummy.prototype.onAfterFind).toHaveBeenCalledWith(options);
        expect(Dummy.prototype.onAfterFind.calls.count()).toEqual(1);
      });
    });

  });

  describe('.findByPk', () => {
    beforeEach(() => {
      spyOn(Dummy, 'findOne').and.callFake(() => {
        return Promise.resolve({});
      });
    });

    it('should call #findOne with correct filter', () => {
      var options = {
        random: 'stuff'
      };

      return Dummy.findByPk(1, options).then(() => {
        expect(Dummy.findOne).toHaveBeenCalledWith({
          where: {
            'id': 1
          }
        }, {
          'random': 'stuff',
          'primaryKeyValue': 1
        });
      });
    });

    afterEach(() => {
      Dummy.findOne.and.callThrough();
    });
  });

  describe('.findAll', () => {
    it('should call #findAll on the connector', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([
          {},
          {}
        ]);
      });

      var filter = {
        where: {a: '1'}
      };

      var options = {
        random: 'stuff'
      };

      return Dummy.findAll(filter, options).then(() => {
        expect(connector.read).toHaveBeenCalledWith(filter, expectedOptions);
      });
    });

    it('should populate the model with the result', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([
          {
            id: 1,
            firstName: 'Tan',
            lastName: 'Nguyen'
          },
          {
            id: 2,
            firstName: 'Tan',
            lastName: 'Nguyen'
          }
        ]);
      });

      var filter = {
        where: {a: '1'}
      };

      var options = {
        random: 'stuff'
      };

      return Dummy.findAll(filter, options).then((instances) => {
        _.each(instances, (instance, index) => { //eslint-disable-line max-nested-callbacks
          expect(instance instanceof Dummy).toBe(true);
          expect(instance.id).toEqual(index + 1);
          expect(instance.firstName).toEqual('Tan');
          expect(instance.lastName).toEqual('Nguyen');
        });
      });
    });

    it('should call #onAfterFind on each instance found', () => {
      connector.read.and.callFake(() => {
        return Promise.resolve([{}, {}]);
      });

      var options = {
        random: 'stuff'
      };

      return Dummy.findAll({}, options).then(() => {
        expect(Dummy.prototype.onAfterFind.calls.count()).toEqual(2);
      });
    });

  });

  describe('#create', () => {
    it('should call #create on the connector', () => {
      var instance = new Dummy({
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(connector.create).toHaveBeenCalledWith({
          firstName: 'Tan',
          lastName: 'Nguyen'
        }, expectedOptions);
      });
    });

    it('should reject if the model is not new', () => {
      var instance = new Dummy({
        id: 1,
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      return instance.create().then(() => {
        throw 'Must reject';
      }, () => {

      });
    });

    it('should set attributes for the model afterward', () => {
      var instance = new Dummy({
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      connector.create.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          firstName: 'Tan',
          lastName: 'Nguyen'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then((instance) => {
        expect(connector.create).toHaveBeenCalledWith({
          firstName: 'Tan',
          lastName: 'Nguyen'
        }, expectedOptions);

        expect(instance instanceof Dummy).toBe(true);
        expect(instance.id).toEqual(1);
      });
    });

    it('should call #validate on the model', () => {
      var instance = new Dummy();
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

    it('should call #onBeforeCreate on the model', () => {
      var instance = new Dummy();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onBeforeCreate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(instance.onBeforeCreate).toHaveBeenCalledWith(options);
      });
    });

    it('should not call #onBeforeCreate if validation fails', () => {
      var instance = new Dummy();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(false);
      });

      spyOn(instance, 'onBeforeCreate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(instance.onBeforeCreate).not.toHaveBeenCalledWith(options);
      });
    });

    it('should call #onAfterCreate on the model', () => {
      var instance = new Dummy();
      connector.create.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onAfterCreate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.create(options).then(() => {
        expect(instance.onAfterCreate).toHaveBeenCalledWith(options);
      });
    });
  });

  describe('#update', () => {
    it('should call #update on the connector', () => {
      var instance = new Dummy({
        id: 1,
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      connector.update.and.callFake(() => {
        return Promise.resolve(instance);
      });

      var options = {
        random: 'stuff'
      };

      let updateOptions = extendExpectedOptions({
        primaryKeyValue: 1
      });

      return instance.update(options).then(() => {
        expect(connector.update).toHaveBeenCalledWith({
          where: {
            id: 1
          }
        }, {
          firstName: 'Tan',
          lastName: 'Nguyen'
        }, updateOptions);
      });
    });

    it('should reject if the model is new', () => {
      var instance = new Dummy({
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      return instance.update().then(() => {
        throw 'Must reject';
      }, () => {

      });
    });

    it('should set attributes for the model afterward', () => {
      var instance = new Dummy({
        id: 1,
        firstName: 'Tan',
        name: 'Tan Nguyen'
      });

      connector.update.and.callFake(() => {
        return Promise.resolve({
          id: 1,
          firstName: 'Tan',
          lastName: 'Nguyen'
        });
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then((instance) => {
        expect(instance instanceof Dummy).toBe(true);
        expect(instance.id).toEqual(1);
        expect(instance.lastName).toEqual('Nguyen');
      });
    });

    it('should call #validate on the model', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve(instance);
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

    it('should call #onBeforeUpdate on the model', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onBeforeUpdate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(instance.onBeforeUpdate).toHaveBeenCalledWith(options);
      });
    });

    it('should not call #onBeforeUpdate if validation fails', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'validate').and.callFake(() => {
        return Promise.resolve(false);
      });

      spyOn(instance, 'onBeforeUpdate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(instance.onBeforeUpdate).not.toHaveBeenCalledWith(options);
      });
    });

    it('should call #onAfterUpdate on the model', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.update.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onAfterUpdate').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.update(options).then(() => {
        expect(instance.onAfterUpdate).toHaveBeenCalledWith(options);
      });
    });
  });

  describe('#save', () => {
    var instance;
    beforeEach(() => {
      instance = new Dummy({
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      spyOn(instance, 'update').and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'create').and.callFake(() => {
        return Promise.resolve(instance);
      });
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
  });

  describe('#delete', () => {
    it('should call #delete on the connector', () => {
      var instance = new Dummy({
        id: 1,
        firstName: 'Tan',
        lastName: 'Nguyen',
        name: 'Tan Nguyen'
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve(instance);
      });

      var options = {
        random: 'stuff'
      };

      let deleteOptions = extendExpectedOptions({
        primaryKeyValue: 1
      });

      return instance.delete(options).then(() => {
        expect(connector.delete).toHaveBeenCalledWith({
          where: {
            id: 1
          }
        }, deleteOptions);
      });
    });

    it('should call #onBeforeDelete on the model', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onBeforeDelete').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.delete(options).then(() => {
        expect(instance.onBeforeDelete).toHaveBeenCalledWith(options);
      });
    });

    it('should call #onAfterDelete on the model', () => {
      var instance = new Dummy({
        id: 1
      });

      connector.delete.and.callFake(() => {
        return Promise.resolve(instance);
      });

      spyOn(instance, 'onAfterDelete').and.callFake(() => {
        return Promise.resolve(true);
      });

      var options = {
        random: 'stuff'
      };

      return instance.delete(options).then(() => {
        expect(instance.onAfterDelete).toHaveBeenCalledWith(options);
      });
    });
  });

  describe('.deleteAll', () => {
    it('should call .deleteAll on the connector', () => {
      connector.delete.and.callFake(() => {
        return Promise.resolve({});
      });

      var options = {
        random: 'stuff'
      };

      var filter = {
        where: {
          test: 1
        }
      };

      return Dummy.deleteAll(filter, options).then(() => {
        expect(connector.delete).toHaveBeenCalledWith({
          where: {
            test: 1
          }
        }, expectedOptions);
      });
    });
  });

  describe('.getDefaultEndPoints', () => {
    it('should construct default end points using the defined primary key', () => {
      expect(Dummy.getDefaultEndPoints()).toEqual(DEFAULT_ENDPOINTS);
    });
  });

  describe('#getEndPoints', () => {
    afterEach(() => {
      delete Dummy.endPoints;
    });

    it('should merge user-defined end points and default end points', () => {
      Dummy.endPoints = {
        'test': {
          path: 'test',
          type: 'GET'
        }
      };

      expect(Dummy.getEndPoints()).toEqual(_.extend({
        'test': {
          path: 'test',
          type: 'GET'
        }
      }, DEFAULT_ENDPOINTS));
    });
  });

  describe('.executeApi', () => {
    beforeEach(() => {
      DEFAULT_API_HANDLERS.forEach((method) => {
        spyOn(Dummy, method).and.callFake(function() {
          return Promise.resolve({});
        });
      });
    });

    afterEach(() => {
      DEFAULT_API_HANDLERS.forEach((method) => {
        Dummy[method].calls.reset();
        Dummy[method].and.callThrough();
      });
    });

    it('should call method with correct arguments', () => {
      return Dummy.executeApi('list', {where: {test: 'test'}}).then(() => {
        expect(Dummy.list.calls.count()).toEqual(1);
        expect(Dummy.list).toHaveBeenCalledWith({
          where: {
            test: 'test'
          }
        }, undefined);
      });
    });

    DEFAULT_API_HANDLERS.forEach((method) => {
      it(`should call #${method} on data mapper`, () => {
        return Dummy.executeApi(method).then(() => {
          expect(Dummy[method]).toHaveBeenCalled();
        });
      });
    });

    it('should return error when the method is not found', () => {
      return Dummy.executeApi('invalid').then(function() {
        throw 'Should not succeed';
      }, (error) => {
        expect(error.code).toEqual(500);
        expect(error.httpCode).toEqual(500);
      });
    });
  });

  describe('.beforeApi', () => {
    var before0, before1, calls;

    beforeEach(() => {
      Dummy.clearBeforeApiHooks();

      before0 = jasmine.createSpy();
      before1 = jasmine.createSpy();
      calls = [];
      Dummy.beforeApi('list', before0);
      Dummy.beforeApi('list', before1);

      spyOn(Dummy, 'list').and.callFake(() => {
        return Promise.resolve([]);
      });
    });

    afterEach(() => {
      Dummy.list.calls.reset();
      Dummy.list.and.callThrough();
    });

    it('should call before hooks before calling the method', () => {
      before0.and.callFake(() => {
        calls.push(0);
        return Promise.resolve(true);
      });

      before1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      Dummy.list.and.callFake(() => {
        calls.push(2);
        return Promise.resolve({});
      });

      return Dummy.executeApi('list', {test: 'test'}).then(() => {
        expect(calls).toEqual([0, 1, 2]);
        expect(before0).toHaveBeenCalledWith({test: 'test'}, undefined);
        expect(before1).toHaveBeenCalledWith({test: 'test'}, undefined);
      });
    });

    it('should not call the method when any of the before hooks return error', () => {
      before0.and.callFake(() => {
        calls.push(0);
        let error = new Error();
        error.code = 400;
        return Promise.reject(error);
      });

      before1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      Dummy.list.and.callFake(() => {
        calls.push(2);
        return Promise.resolve({});
      });

      return Dummy.executeApi('list', {test: 'test'}).then(fail, (error) => {
        expect(calls).toEqual([0]);
        expect(error.code).toEqual(400);
      });
    });

  });

  describe('.afterApi', () => {
    var after0, after1, calls;

    beforeEach(() => {
      Dummy.clearAfterApiHooks();

      after0 = jasmine.createSpy();
      after1 = jasmine.createSpy();
      calls = [];
      Dummy.afterApi('list', after0);
      Dummy.afterApi('list', after1);

      spyOn(Dummy, 'list').and.callFake(() => {
        return Promise.resolve([]);
      });
    });

    afterEach(() => {
      Dummy.list.calls.reset();
      Dummy.list.and.callThrough();
    });

    it('should call after hooks after calling the method', () => {
      after0.and.callFake(() => {
        calls.push(0);
        return Promise.resolve(true);
      });

      after1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      Dummy.list.and.callFake(() => {
        calls.push(2);
        return Promise.resolve(3);
      });

      return Dummy.executeApi('list', {test: 'test'}).then(() => {
        expect(calls).toEqual([2, 0, 1]);
        expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
        expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
      });
    });

    it('should ignore error during the execution of after hooks', () => {
      after0.and.callFake(() => {
        calls.push(0);
        let error = new Error();
        error.code = 400;
        return Promise.reject(error);
      });

      after1.and.callFake(() => {
        calls.push(1);
        return Promise.resolve(true);
      });

      Dummy.list.and.callFake(() => {
        calls.push(2);
        return Promise.resolve(3);
      });

      return Dummy.executeApi('list', {test: 'test'}).then(() => {
        expect(calls).toEqual([2, 0, 1]);
        expect(after0).toHaveBeenCalledWith({test: 'test'}, 3);
        expect(after1).toHaveBeenCalledWith({test: 'test'}, 3);
      });
    });
  });

});
