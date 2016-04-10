/*eslint max-nested-callbacks:0*/

'use strict';
var Api = require('../../build/Api')
  , Promise = require('@naujs/util').getPromise();

describe('Api', () => {
  describe('#execute', () => {
    var args, ctx, handler;
    var api;

    beforeEach(() => {
      args = {
        name: 1
      };

      ctx = {
        test: 2
      };

      handler = jasmine.createSpy('handler');
      api = new Api('test', {}, handler);
    });

    it('should pass args and ctx to the handler', () => {
      return api.execute(args, ctx).then(() => {
        expect(handler).toHaveBeenCalledWith(args, ctx);
      });
    });

    it('should pass args and ctx to before hooks', () => {
      var before = jasmine.createSpy('before');
      api.before(before);

      return api.execute(args, ctx).then(() => {
        expect(before).toHaveBeenCalledWith(args, ctx);
      });
    });

    it('should pass result, args and ctx to after hooks', () => {
      var after = jasmine.createSpy('after');
      handler.and.returnValue(100);
      api.after(after);

      return api.execute(args, ctx).then(() => {
        expect(after).toHaveBeenCalledWith(100, args, ctx);
      });
    });

    it('should stop when having a rejection', () => {
      api.before(() => {
        return Promise.reject('Error');
      });

      return api.execute(args, ctx).then(() => {
        fail('Should reject');
      }).catch((error) => {
        expect(error).toEqual('Error');
      });
    });

    it('should run hooks in correct order', () => {
      var check = [];

      api.before(() => {
        check.push(0);
      });

      api.before(() => {
        check.push(1);
      });

      api.before(() => {
        check.push(2);
      });

      api.after(() => {
        check.push(3);
      });

      api.after(() => {
        check.push(4);
      });

      return api.execute(args, ctx).then(() => {
        expect(check).toEqual([
          0,
          1,
          2,
          3,
          4
        ]);
      });
    });
  });
});
