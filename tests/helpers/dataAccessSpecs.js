var _ = require('lodash');

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

        expect(store.toJSON()).toEqual({
          name: 'Store 1',
          id: 1,
          user_id: 1,
          products: [
            {
              name: 'Product 1',
              id: 1,
              store_id: 1
            },
            {
              name: 'Product 2',
              id: 2,
              store_id: 1
            },
            {
              name: 'Product 3',
              id: 3,
              store_id: 1
            }
          ]
        });

        var products = store.products();
        expect(products.length).toBe(3);

        _.each(products, (product) => {
          expect(product instanceof Product).toBe(true);
        });
      });
    });

    it('should include hasOne relation', () => {
      return Store.findAll({
        include: 'alias'
      }).then((stores) => {
        var store = stores[0];
        var alias = store.alias();
        expect(alias instanceof Alias).toBe(true);
        expect(alias.toJSON()).toEqual({
          name: 'store-1',
          id: 1,
          store_id: 1
        });
      });
    });

    it('should include belongsTo relation', () => {
      return Store.findOne({
        include: 'owner'
      }).then((store) => {
        var owner = store.owner();
        expect(owner instanceof User).toBe(true);
        expect(owner.toJSON()).toEqual({
          name: 'User 1',
          id: 1
        });
      });
    });

    it('should include hasManyAndBelongsTo relation', () => {
      return Store.findOne({
        where: {
          name: 'Store 1'
        },
        include: 'tags'
      }).then((store) => {
        var tags = store.tags();
        expect(tags.length).toBe(2);
        _.each(tags, (tag) => {
          expect(tag instanceof Tag).toBe(true);
        });
        expect(tags[0].toJSON()).toEqual({
          name: 'Tag1',
          id: 1
        });
        expect(tags[1].toJSON()).toEqual({
          name: 'Tag2',
          id: 2
        });
      });
    });
  });

  describe('.findOne', () => {
    it('should return one instance', () => {
      return Store.findOne({
        where: {
          name: 'Store 1'
        }
      }).then((store) => {
        expect(store.id).toEqual(1);
      });
    });
  });

  describe('.findByPk', () => {
    it('should return instance matched the primary key', () => {
      return Store.findByPk(1, {
        include: 'owner'
      }).then((store) => {
        expect(store.toJSON()).toEqual({
          name: 'Store 1',
          id: 1,
          user_id: 1,
          owner: {
            name: 'User 1',
            id: 1
          }
        });
      });
    });
  });

  describe('#save', () => {
    it('should create new instance', () => {
      var store = new Store({
        name: 'Store 4'
      });

      return store.save().then((savedStore) => {
        expect(savedStore.id).toEqual(4);

        return Store.findAll().then((stores) => {
          expect(stores.length).toEqual(4);
        });
      });
    });

    it('should update existing instance', () => {
      return Store.findByPk(1).then((store) => {
        store.name = 'Store 4';
        return store.save().then(() => {
          return Store.findByPk(1);
        }).then((newStore) => {
          expect(newStore.name).toEqual('Store 4');
        });
      });
    });
  });

  describe('#delete', () => {
    it('should delete the instance', () => {
      return Store.findByPk(1).then((store) => {
        return store.delete();
      }).then(() => {
        return Store.findAll();
      }).then((stores) => {
        expect(stores.length).toEqual(2);
      });
    });
  });

  describe('.deleteAll', () => {
    it('should delete all instances matched the criteria', () => {
      return Store.deleteAll({
        where: {
          id: {
            gte: 2
          }
        }
      }).then(() => {
        return Store.findAll();
      }).then((stores) => {
        expect(stores.length).toEqual(1);
        expect(stores[0].id).toEqual(1);
      });
    });
  });
};
