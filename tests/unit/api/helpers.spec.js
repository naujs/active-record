'use strict';

var helpers = require('../../../build/api/helpers');

describe('api/helpers', () => {
  describe('.generatePathWithPk', () => {
    it('should generate correct path using the pk', () => {
      expect(helpers.generatePathWithPk(Store)).toEqual('/:id');
    });
  });

  describe('.generateArgsWithPk', () => {
    it('should generate args with pk', () => {
      expect(helpers.generateArgsWithPk(Store)).toEqual({
        id: {
          type: 'number',
          required: true
        }
      });
    });
  });

  describe('.generateArgsFromProperties', () => {
    it('should generate args from properties', () => {
      expect(helpers.generateArgsFromProperties(Store)).toEqual({
        name: {
          type: 'string',
          required: true
        },
        user_id: 'number'
      });
    });
  });
});
