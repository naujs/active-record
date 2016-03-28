global.testDataAccessMethods = function() {
  describe('.findAll', () => {
    it('should return all instances', () => {
      return Store.findAll().then((stores) => {
        expect(stores.length).toEqual(3);
        for (var i in stores) {
          expect(stores[i] instanceof Store).toBe(true);
        }
      });
    });

    it('should return only instances matching the filter', () => {
      return Store.findAll({
        where: {
          name: 'Store 3'
        }
      }).then((stores) => {
        expect(stores.length).toBe(1);
        expect(stores[0].getAttributes()).toEqual({
          id: 3,
          name: 'Store 3',
          user_id: 3
        });
      });
    });

    it('should return correct amount of store matching the limit', () => {
      return Store.findAll({
        limit: 1
      }).then((stores) => {
        expect(stores.length).toEqual(1);
      });
    });

    it('should include hasMany relation', () => {
      return Store.findAll({
        include: 'products'
      }).then((stores) => {
        expect(stores.length).toEqual(3);
        var store = stores[0];
        console.log(store);
      });
    });
  });
};
