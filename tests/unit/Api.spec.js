/*eslint max-nested-callbacks:0*/

'use strict';
var Api = require('../../build/Api')
  , Promise = require('@naujs/util').getPromise();

describe('Api', () => {
  describe('.buildMixin', () => {
    var mixin;
    describe('#api', () => {
      beforeEach(() => {
        mixin = Api.buildMixin();
      });

      it('should define API', () => {
        mixin.api('test', {
          args: {
            name: 'string'
          }
        });

        var api = mixin._api;
        expect(api.length).toEqual(1);
        expect(api[0].getArgs()).toEqual({
          name: {
            type: 'string'
          }
        });
      });

      it('should allow overwrite API', () => {
        mixin.api('test', {
          args: {
            name: 'string'
          }
        });

        mixin.api('test', {
          args: {
            name: 'string',
            age: 'number'
          }
        });

        var api = mixin._api;
        expect(api.length).toEqual(1);
        expect(api[0].getArgs()).toEqual({
          name: {
            type: 'string'
          },
          age: {
            type: 'number'
          }
        });
      });
    });

    describe('Default API', () => {
      beforeEach(() => {
        mixin = Api.buildMixin({
          defaultApi: function() {
            return new Api('test', {
              args: {
                name: 'string'
              }
            });
          }
        });
      });

      it('should setup default api', () => {
        var api = mixin.getApiOrUseDefault('test');
        expect(api.getArgs()).toEqual({
          name: {
            type: 'string'
          }
        });
      });
    });
  });
});
