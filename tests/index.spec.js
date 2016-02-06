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
          'random': 'stuff'
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

});
